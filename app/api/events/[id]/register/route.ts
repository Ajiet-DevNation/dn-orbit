import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { isApproved } from "@/lib/access";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { usesSecureCookies } from "@/lib/cookies";
import { db } from "@/lib/db";
import { registrationClosesAt } from "@/lib/event-order";
import {
  type EventAudience,
  parseFormSchema,
  validateSubmission,
} from "@/lib/forms";
import { invalidatePublic, PUBLIC_TAG } from "@/lib/public-tags";
import { rateLimit, rateLimitKey, tooManyRequests } from "@/lib/rate-limit";
import { REG_COOKIE_MAX_AGE_S, regCookieName } from "@/lib/registration-cookie";
import { parseTeamConfig } from "@/lib/teams";
import { parseBody, registrationBodySchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

type Outcome =
  | { ok: true; id: string }
  | {
      ok: false;
      status: 409;
      error: string;
      fields?: Record<string, string>;
    };

export async function POST(req: NextRequest, { params }: Params) {
  const { id: eventId } = await params;

  // Public-audience events accept registrations from anonymous callers, so this
  // is the app's most exposed write. Throttle before touching the database.
  // Signed-in callers are keyed by account. Anonymous ones by IP, with a higher
  // ceiling: a whole class registering from campus Wi-Fi shares one egress IP.
  const session = await auth();
  const limit = session
    ? rateLimit(
        rateLimitKey(req, "event-register", session.user.id),
        10,
        60_000,
      )
    : rateLimit(rateLimitKey(req, "event-register"), 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event)
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.reviewStatus !== "approved" || !event.isPublished)
    return NextResponse.json({ error: "Event not available" }, { status: 403 });

  const audience = event.audience as EventAudience;

  // Members-only events require an approved, signed-in member. The combined
  // members+AJIET tier doesn't gate on an account (AJIET students register by
  // USN), but a signed-in approved member still registers via their identity.
  const needsMemberCheck =
    audience === "members" || audience === "members_college";
  const approvedMember =
    needsMemberCheck && !!session && (await isApproved(session.user.id));

  if (audience === "members") {
    if (!session)
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    if (!approvedMember)
      return NextResponse.json({ error: "Pending approval" }, { status: 403 });
  }

  const isMember = approvedMember; // member path → locked identity, USN exempt

  // Deadline + capacity gates.
  if (new Date() > registrationClosesAt(event))
    return NextResponse.json({ error: "Registration closed" }, { status: 409 });

  // Fast, non-authoritative pre-check: reject an obviously-full event before
  // doing validation work. The real, race-free guard runs under a row lock at
  // insert time (see the transaction below).
  if (event.capacity != null) {
    const count = await db.registration.count({ where: { eventId } });
    if (count >= event.capacity)
      return NextResponse.json({ error: "Event is full" }, { status: 409 });
  }

  // parseBody also requires the JSON content type: this route is open to
  // anonymous callers, and a cross-site text/plain form could otherwise make
  // visitors' browsers register addresses of an attacker's choosing.
  const parsed = await parseBody(req, registrationBodySchema);
  if (!parsed.ok)
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = parsed.data;

  // One registration per account. The (eventId, email) key alone let a
  // signed-in user register again under other emails, and every attended row
  // counts toward their leaderboard event score.
  if (session) {
    const existing = await db.registration.findFirst({
      where: { eventId, userId: session.user.id },
      select: { id: true },
    });
    if (existing)
      return NextResponse.json(
        { error: "You are already registered for this event" },
        { status: 409 },
      );
  }

  // Members submit under their account identity (email locked server-side).
  const input =
    isMember && session
      ? {
          name: session.user.name ?? body.name,
          email: session.user.email ?? body.email,
          // Members' USN comes from their account, not the (lockable) form field.
          usn: session.user.usn ?? body.usn,
          responses: body.responses,
        }
      : body;

  const schema = parseFormSchema(event.formSchema);
  const result = validateSubmission({ audience, isMember, schema, input });
  if (!result.ok) {
    return NextResponse.json(
      { error: "Validation failed", fields: result.errors },
      { status: 422 },
    );
  }

  // Team events: this is step 1 only (the registrant's details). Picking a
  // team is step 2, POST /api/events/[id]/team, so someone who stops halfway
  // comes back to the team step instead of a blank form.
  const teamConfig = parseTeamConfig(event.teamConfig);

  try {
    const data = {
      eventId,
      userId: session?.user.id ?? null,
      name: result.value.name,
      email: result.value.email,
      usn: result.value.usn ?? null,
      responses: result.value.responses as Prisma.InputJsonValue,
    };

    // Authoritative capacity guard. For a capped or team event we lock the
    // event row (`FOR UPDATE`) so concurrent registrations serialize here, then
    // re-check under that lock before inserting — closing the check-then-act
    // race where two requests both pass the pre-check above and overshoot
    // capacity (or both take one USN).
    // Other events skip the transaction entirely: a plain insert, no
    // BEGIN/COMMIT round trips and no pooled connection held open.
    const outcome: Outcome =
      event.capacity == null && !teamConfig
        ? { ok: true, id: (await db.registration.create({ data })).id }
        : await db.$transaction(
            async (tx): Promise<Outcome> => {
              const locked = await tx.$queryRaw<{ capacity: number | null }[]>`
                SELECT capacity FROM events WHERE id = ${eventId} FOR UPDATE
              `;
              const cap = locked[0]?.capacity ?? null;
              if (cap != null) {
                const count = await tx.registration.count({
                  where: { eventId },
                });
                if (count >= cap)
                  return { ok: false, status: 409, error: "Event is full" };
              }
              // Team events: one registration per person. Email is unique
              // already; this stops one student filling two team seats under
              // two addresses.
              if (teamConfig && data.usn) {
                const dupe = await tx.registration.findFirst({
                  where: {
                    eventId,
                    usn: { equals: data.usn, mode: "insensitive" },
                  },
                  select: { id: true },
                });
                if (dupe) {
                  const error = "This USN is already registered for this event";
                  return {
                    ok: false,
                    status: 409,
                    error,
                    fields: { usn: error },
                  };
                }
              }
              const created = await tx.registration.create({ data });
              return { ok: true, id: created.id };
            },
            // A popular capped event queues registrants on the row lock; give
            // the queue room before Prisma's 2s/5s defaults turn it into 500s.
            { maxWait: 5_000, timeout: 10_000 },
          );

    if (!outcome.ok) {
      return NextResponse.json(
        { error: outcome.error, fields: outcome.fields },
        { status: outcome.status },
      );
    }
    // Cards show seat counts / FULL.
    invalidatePublic(PUBLIC_TAG.events);

    void logAudit({
      action: "registration.create",
      actorId: session?.user.id ?? null,
      actorName: result.value.name,
      summary: `${result.value.name} registered for "${event.title}"`,
    });

    const res = NextResponse.json({ id: outcome.id }, { status: 201 });
    // Identifies this browser's registration: it's how the registrant comes
    // back to their team (or to the team step) instead of a blank form, and
    // what authorizes step 2. See lib/registration-cookie.ts.
    res.cookies.set(regCookieName(eventId), outcome.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: usesSecureCookies(
        req.nextUrl.protocol,
        req.headers.get("x-forwarded-proto"),
      ),
      path: "/",
      maxAge: REG_COOKIE_MAX_AGE_S,
    });
    return res;
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "This email is already registered for this event" },
        { status: 409 },
      );
    }
    // Couldn't get a slot in the queue for the capacity lock in time.
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2028"
    ) {
      return NextResponse.json(
        { error: "Registration is busy right now — please retry in a moment." },
        { status: 503, headers: { "Retry-After": "3" } },
      );
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id: eventId } = await params;
  const where = { eventId, userId: session.user.id };
  const teamIds = (
    await db.registration.findMany({ where, select: { teamId: true } })
  ).flatMap((r) => (r.teamId ? [r.teamId] : []));

  if (teamIds.length === 0) {
    await db.registration.deleteMany({ where });
  } else {
    // Leaving a team: drop the team too once nobody is left in it, under the
    // same event lock as register so a join can't land in a team being deleted.
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
      await tx.registration.deleteMany({ where });
      await tx.eventTeam.deleteMany({
        where: { id: { in: teamIds }, members: { none: {} } },
      });
    });
  }
  // Cards show seat counts.
  invalidatePublic(PUBLIC_TAG.events);
  const res = NextResponse.json({ success: true });
  res.cookies.delete(regCookieName(eventId));
  return res;
}
