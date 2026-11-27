// Step 2 of a team event (lib/teams.ts): the registrant creates a team or joins
// one with its invite code. Step 1, POST ../register, saved their details and
// gave this browser the registration cookie; that cookie (or the signed-in
// account) is what says whose registration gets the team.

import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { after, type NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatEventDateLong, formatEventTime } from "@/lib/event-format";
import { registrationClosesAt } from "@/lib/event-order";
import { parseFormSchema } from "@/lib/forms";
import { sendMail } from "@/lib/mail";
import { invalidatePublic, PUBLIC_TAG } from "@/lib/public-tags";
import { rateLimit, rateLimitKey, tooManyRequests } from "@/lib/rate-limit";
import {
  myRegistrationWhere,
  parseRegCookie,
  regCookieName,
} from "@/lib/registration-cookie";
import { teamRegistrationMail } from "@/lib/team-mail";
import {
  formatTeamCode,
  generateTeamCode,
  matchValueFor,
  parseTeamConfig,
  TEAM_ERROR_KEYS,
  type TeamChoice,
  type TeamConfig,
  teamNameKey,
  teamSizeLabel,
  validateTeamChoice,
} from "@/lib/teams";
import { parseBody, teamChoiceBodySchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

type TeamResult = {
  name: string;
  code: string;
  size: number;
  matchValue: string | null;
  role: "created" | "joined";
};

type Outcome =
  | { ok: true; team: TeamResult }
  | {
      ok: false;
      status: 409 | 422;
      error: string;
      fields?: Record<string, string>;
    };

const reject = (status: 409 | 422, error: string, field?: string): Outcome => ({
  ok: false,
  status,
  error,
  fields: field ? { [field]: error } : undefined,
});

/**
 * Creates the team or seats the registrant in one. Must run inside the
 * transaction that holds the event row lock: the slot, size and name checks
 * are check-then-act, and the lock is what makes them race-free (two people
 * taking a team's last seat, or the 13th team).
 */
async function assignTeam(
  tx: Prisma.TransactionClient,
  eventId: string,
  registrationId: string,
  config: TeamConfig,
  choice: TeamChoice,
  matchValue: string | null,
  matchLabel: string,
): Promise<Outcome> {
  // Re-read under the lock: a double-clicked submit must not put one person
  // in two teams.
  const reg = await tx.registration.findUnique({
    where: { id: registrationId },
    select: { teamId: true },
  });
  if (reg?.teamId) return reject(409, "You're already in a team");

  if (choice.action === "create") {
    if (config.maxTeams != null) {
      const teams = await tx.eventTeam.count({ where: { eventId } });
      if (teams >= config.maxTeams)
        return reject(
          409,
          `All ${config.maxTeams} team slots are taken. Ask a team for its invite code and join it instead.`,
          TEAM_ERROR_KEYS.name,
        );
    }
    const nameKey = teamNameKey(choice.name);
    const taken = await tx.eventTeam.findUnique({
      where: { eventId_nameKey: { eventId, nameKey } },
      select: { id: true },
    });
    if (taken)
      return reject(
        409,
        "That team name is taken. Pick another.",
        TEAM_ERROR_KEYS.name,
      );

    // A clash is ~1 in 10^11 per try; the loop is a guard, not a hot path.
    let code = generateTeamCode();
    for (let tries = 1; ; tries++) {
      const clash = await tx.eventTeam.findUnique({
        where: { eventId_code: { eventId, code } },
        select: { id: true },
      });
      if (!clash) break;
      if (tries >= 5) throw new Error("Could not allocate a unique team code");
      code = generateTeamCode();
    }

    const team = await tx.eventTeam.create({
      data: { eventId, name: choice.name, nameKey, code, matchValue },
    });
    await tx.registration.update({
      where: { id: registrationId },
      data: { teamId: team.id },
    });
    return {
      ok: true,
      team: { name: team.name, code, size: 1, matchValue, role: "created" },
    };
  }

  const team = await tx.eventTeam.findUnique({
    where: { eventId_code: { eventId, code: choice.code } },
    select: {
      id: true,
      name: true,
      code: true,
      matchValue: true,
      _count: { select: { members: true } },
    },
  });
  if (!team)
    return reject(
      422,
      "No team has that invite code. Check it with your teammate.",
      TEAM_ERROR_KEYS.code,
    );
  if (team._count.members >= config.maxSize)
    return reject(
      409,
      `"${team.name}" is full (${config.maxSize} of ${config.maxSize} members).`,
      TEAM_ERROR_KEYS.code,
    );
  if (config.matchFieldId && team.matchValue !== matchValue)
    return reject(
      409,
      `"${team.name}" is a ${team.matchValue ?? "different"} team. Every member must have the same ${matchLabel}.`,
      TEAM_ERROR_KEYS.code,
    );

  await tx.registration.update({
    where: { id: registrationId },
    data: { teamId: team.id },
  });
  return {
    ok: true,
    team: {
      name: team.name,
      code: team.code,
      size: team._count.members + 1,
      matchValue: team.matchValue,
      role: "joined",
    },
  };
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id: eventId } = await params;

  // Same ceilings as registering. Wrong invite codes cost one request each, so
  // this also bounds code guessing (31^8 codes).
  const session = await auth();
  const limit = session
    ? rateLimit(rateLimitKey(req, "event-team", session.user.id), 10, 60_000)
    : rateLimit(rateLimitKey(req, "event-team"), 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (event?.reviewStatus !== "approved" || !event.isPublished)
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const config = parseTeamConfig(event.teamConfig);
  if (!config)
    return NextResponse.json(
      { error: "This event has no teams" },
      { status: 404 },
    );
  if (new Date() > registrationClosesAt(event))
    return NextResponse.json({ error: "Registration closed" }, { status: 409 });

  // parseBody also requires the JSON content type, so another site can't post
  // this from a visitor's browser (a cross-site JSON POST needs CORS).
  const parsed = await parseBody(req, teamChoiceBodySchema);
  if (!parsed.ok)
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  const choice = validateTeamChoice(parsed.data);
  if (!choice.ok)
    return NextResponse.json(
      { error: "Validation failed", fields: choice.errors },
      { status: 422 },
    );

  const where = myRegistrationWhere(
    eventId,
    parseRegCookie((await cookies()).get(regCookieName(eventId))?.value),
    session?.user.id,
  );
  const registration = where
    ? await db.registration.findFirst({
        where,
        select: { id: true, name: true, email: true, responses: true },
      })
    : null;
  if (!registration)
    return NextResponse.json(
      {
        error:
          "We couldn't find your registration on this browser. Register first, then pick your team.",
      },
      { status: 401 },
    );

  const responses = (registration.responses ?? {}) as Record<string, unknown>;
  const matchLabel = (
    parseFormSchema(event.formSchema).find((f) => f.id === config.matchFieldId)
      ?.label ?? "answer"
  ).toLowerCase();

  let outcome: Outcome;
  try {
    outcome = await db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
        return assignTeam(
          tx,
          eventId,
          registration.id,
          config,
          choice.value,
          matchValueFor(config, responses),
          matchLabel,
        );
      },
      // Teams fill in bursts (a class at once); give the lock queue room
      // before Prisma's 2s/5s defaults turn it into 500s.
      { maxWait: 5_000, timeout: 10_000 },
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2028")
      return NextResponse.json(
        { error: "Teams are busy right now — please retry in a moment." },
        { status: 503, headers: { "Retry-After": "3" } },
      );
    throw e;
  }

  if (!outcome.ok)
    return NextResponse.json(
      { error: outcome.error, fields: outcome.fields },
      { status: outcome.status },
    );

  // Cards show team counts / FULL.
  invalidatePublic(PUBLIC_TAG.events);
  const team = outcome.team;
  void logAudit({
    action: `team.${team.role === "created" ? "create" : "join"}`,
    actorId: session?.user.id ?? null,
    actorName: registration.name,
    summary: `${registration.name} ${team.role} team "${team.name}" for "${event.title}"`,
  });

  const mail = teamRegistrationMail({
    name: registration.name,
    eventTitle: event.title,
    when: [
      formatEventDateLong(event.eventDate),
      formatEventTime(event.eventDate),
      event.location,
    ]
      .filter(Boolean)
      .join(" · "),
    role: team.role,
    teamName: team.name,
    code: formatTeamCode(team.code),
    size: team.size,
    sizeLabel: teamSizeLabel(config),
    matchValue: team.matchValue,
  });
  // After the response: the team is saved either way, and a slow mail API
  // shouldn't hold the spinner. sendMail never throws.
  after(() => sendMail({ to: registration.email, ...mail }));

  return NextResponse.json({
    team: {
      name: team.name,
      code: formatTeamCode(team.code),
      size: team.size,
      role: team.role,
    },
  });
}
