import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isApproved } from "@/lib/access";
import { logAudit } from "@/lib/audit";
import {
  parseFormSchema,
  validateSubmission,
  type EventAudience,
} from "@/lib/forms";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id: eventId } = await params;

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.reviewStatus !== "approved" || !event.isPublished)
    return NextResponse.json({ error: "Event not available" }, { status: 403 });

  const audience = event.audience as EventAudience;
  const session = await auth();

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
  const deadline = event.registrationDeadline ?? event.eventDate;
  if (deadline && new Date() > deadline)
    return NextResponse.json({ error: "Registration closed" }, { status: 409 });

  // Fast, non-authoritative pre-check: reject an obviously-full event before
  // doing validation work. The real, race-free guard runs under a row lock at
  // insert time (see the transaction below).
  if (event.capacity != null) {
    const count = await db.registration.count({ where: { eventId } });
    if (count >= event.capacity)
      return NextResponse.json({ error: "Event is full" }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

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

  const result = validateSubmission({
    audience,
    isMember,
    schema: parseFormSchema(event.formSchema),
    input,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Validation failed", fields: result.errors }, { status: 422 });
  }

  try {
    // Authoritative capacity guard. For a capped event we lock the event row
    // (`FOR UPDATE`) so concurrent registrations serialize here, then re-count
    // under that lock before inserting — closing the check-then-act race where
    // two requests both pass the pre-check above and overshoot capacity.
    // Uncapped events skip the lock entirely (no contention on the common path).
    const outcome = await db.$transaction(async (tx) => {
      if (event.capacity != null) {
        const locked = await tx.$queryRaw<{ capacity: number | null }[]>`
          SELECT capacity FROM events WHERE id = ${eventId} FOR UPDATE
        `;
        const cap = locked[0]?.capacity ?? null;
        if (cap != null) {
          const count = await tx.registration.count({ where: { eventId } });
          if (count >= cap) return { full: true as const };
        }
      }
      const created = await tx.registration.create({
        data: {
          eventId,
          userId: session?.user.id ?? null,
          name: result.value.name,
          email: result.value.email,
          usn: result.value.usn ?? null,
          responses: result.value.responses as Prisma.InputJsonValue,
        },
      });
      return { full: false as const, id: created.id };
    });

    if (outcome.full) {
      return NextResponse.json({ error: "Event is full" }, { status: 409 });
    }

    void logAudit({
      action: "registration.create",
      actorId: session?.user.id ?? null,
      actorName: result.value.name,
      summary: `${result.value.name} registered for "${event.title}"`,
    });
    return NextResponse.json({ id: outcome.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "This email is already registered for this event" },
        { status: 409 },
      );
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id: eventId } = await params;
  await db.registration.deleteMany({
    where: { eventId, userId: session.user.id },
  });
  return NextResponse.json({ success: true });
}
