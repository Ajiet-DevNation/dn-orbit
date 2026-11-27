// scripts/addCtf2Event.ts — create (or bring back in line) the Capture The Flag
// 2.0 event.
//
// ── Why a script and not the admin panel ──────────────────────────────────────
// CTF 2.0 is a team event (lib/teams.ts): 12 team slots, 4–6 members per team,
// every member from the same branch. The admin form has no team settings, so
// the event's `teamConfig` can only be written here. Keeping the whole event in
// version control also lets it be reviewed before it reaches production.
//
// ── Safety ───────────────────────────────────────────────────────────────────
//  • Fixed ids: the event and its form fields have hardcoded UUIDs, so running
//    this twice updates the same row and registrants' stored answers (keyed by
//    field id) stay attached to their questions.
//  • Re-runs never touch the banner (added later from the admin panel) or the
//    published state (unless --publish is passed again).
//  • Every value goes through the same zod schemas the API routes use.
//  • Refuses to run until the event_teams migration is applied, which happens
//    on the production deploy (`prisma migrate deploy` in the build).
//  • --dry-run prints the target database and the full payload, writes nothing.
//
// Usage:
//   bun run scripts/addCtf2Event.ts --dry-run    # show what would be written
//   bun run scripts/addCtf2Event.ts              # create/update as a hidden draft
//   bun run scripts/addCtf2Event.ts --publish    # create/update and publish

import "dotenv/config";
import type { Prisma } from "@prisma/client";
import { db } from "../lib/db";
import type { FormFieldDef } from "../lib/forms";
import { BRANCHES } from "../lib/recruitment";
import { teamConfigSchema } from "../lib/teams";
import { createEventSchema } from "../lib/validation";

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const PUBLISH = argv.includes("--publish");

const EVENT_ID = "2d5787a0-fc46-4dba-95c1-02d611b665d8";
const ORGANIZER = "ANI-CPU-tech";

const FIELD = {
  phone: "ef1dd42c-ffdb-4001-bffd-4c6dacf61828",
  branch: "7341ef0d-06b1-403c-9c70-7d21fce33805",
  year: "61c80731-32e0-403e-98e9-c24c354f6bf9",
  experience: "960bf695-dbbe-46cf-8b92-7e1cfd76f162",
} as const;

// Name, email and USN are the registration page's built-in fields (USN is
// always asked on an AJIET-only event), so they are not repeated here.
const FORM_SCHEMA: FormFieldDef[] = [
  {
    id: FIELD.phone,
    type: "short_text",
    label: "Phone number",
    required: true,
    description: "10-digit mobile number. Used only for day-of coordination.",
    placeholder: "9876543210",
    pattern: "^(\\+91[ -]?)?[6-9]\\d{9}$",
  },
  {
    id: FIELD.branch,
    type: "dropdown",
    label: "Branch",
    required: true,
    description: "Every member of a team must be from the same branch.",
    options: [...BRANCHES],
  },
  {
    id: FIELD.year,
    type: "dropdown",
    label: "Year of study",
    required: true,
    options: ["1st", "2nd", "3rd", "4th"],
  },
  {
    id: FIELD.experience,
    type: "single_choice",
    label: "Have you played a CTF before?",
    description: "There's no wrong answer. It helps us plan the day.",
    required: true,
    options: ["First time", "Played once or twice", "Regular player"],
  },
];

const DESCRIPTION = `A full day of team challenges built around Pluton, DevNation's robot mascot. No coding or security experience is needed: every round is built so first-years can compete alongside final-years.

Timing: 11:00 AM – 5:00 PM

Rounds:
• Round 1 · Flag Run: steer Pluton across floating blocks, past lasers and guard bots, by writing short programs in Pluton Script, and capture as many flags as you can
• Round 2 · Meltdown: the top teams race a countdown, one teammate at the console and the rest working from a printed service manual, to talk Pluton through a series of repairs
• Round 3 · Purpose: the finalists pitch a purpose for Pluton live on stage to a panel of judges

Teams:
• 4 to 6 members, all from the same branch
• 12 team slots, first come, first served
• Register yourself, then create a team and share its invite code, or join your teammate's team with theirs`;

// TIMEZONE: lib/event-format.ts formats every event time in UTC, carrying the
// organizer's wall clock as UTC. So 11:00 AM is written T11:00:00Z, not IST.
const EVENT = createEventSchema.parse({
  title: "Capture The Flag 2.0",
  description: DESCRIPTION,
  eventType: "CAPTURE_THE_FLAG",
  eventDate: "2026-12-03T11:00:00Z",
  location: "Room 426",
  audience: "college",
  // Seats aren't capped; the 12 team slots (teamConfig) are the limit.
  capacity: null,
  registrationDeadline: "2026-12-02T23:59:00Z",
  formSchema: FORM_SCHEMA,
});

const TEAM_CONFIG = teamConfigSchema.parse({
  minSize: 4,
  maxSize: 6,
  maxTeams: 12,
  matchFieldId: FIELD.branch,
});

/** Host only, so the operator can see which database is about to change. */
function targetHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").host || "(unset)";
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

async function main() {
  console.log(`Target database: ${targetHost()}`);
  console.log(
    `Mode: ${DRY_RUN ? "DRY RUN" : "WRITE"}${PUBLISH ? " + PUBLISH" : ""}`,
  );

  const migrated = await db.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'team_config'
  `;
  if (Number(migrated[0]?.n ?? 0) === 0) {
    throw new Error(
      "events.team_config is missing: apply the event_teams migration first (it runs on the production deploy).",
    );
  }

  const organizer = await db.user.findUnique({
    where: { githubUsername: ORGANIZER },
    select: { id: true, name: true },
  });
  if (!organizer) throw new Error(`Organizer ${ORGANIZER} not found`);

  const existing = await db.event.findUnique({
    where: { id: EVENT_ID },
    select: {
      isPublished: true,
      bannerUrl: true,
      _count: { select: { registrations: true, teams: true } },
    },
  });

  // The fields this script owns. Banner and publish state are left to the admin
  // panel on re-runs.
  const content = {
    title: EVENT.title,
    description: EVENT.description ?? null,
    eventType: EVENT.eventType ?? null,
    eventDate: EVENT.eventDate,
    location: EVENT.location ?? null,
    audience: EVENT.audience ?? "college",
    capacity: EVENT.capacity ?? null,
    registrationDeadline: EVENT.registrationDeadline ?? null,
    formSchema: EVENT.formSchema as unknown as Prisma.InputJsonValue,
    teamConfig: TEAM_CONFIG as unknown as Prisma.InputJsonValue,
  };

  console.log(
    existing
      ? `Event ${EVENT_ID} exists (${existing._count.registrations} registrations, ${existing._count.teams} teams, ${existing.isPublished ? "published" : "hidden"}): will UPDATE content${PUBLISH ? " and publish" : ""}.`
      : `Event ${EVENT_ID} not found: will CREATE it ${PUBLISH ? "published" : "as a hidden draft"}.`,
  );
  console.log(JSON.stringify({ ...content, organizer: ORGANIZER }, null, 2));
  if (DRY_RUN) return;

  const now = new Date();
  await db.event.upsert({
    where: { id: EVENT_ID },
    create: {
      id: EVENT_ID,
      ...content,
      createdBy: organizer.id,
      bannerUrl: null,
      isPublished: PUBLISH,
      // Created by the president: approved, like events an admin makes in the
      // panel. Publishing stays a separate switch.
      reviewStatus: "approved",
      reviewedById: organizer.id,
      reviewedAt: now,
    },
    update: { ...content, ...(PUBLISH ? { isPublished: true } : {}) },
  });

  await db.auditLog.create({
    data: {
      action: existing ? "event.update" : "event.create",
      summary: `${existing ? "Updated" : "Created"} event "${EVENT.title}" via scripts/addCtf2Event.ts${PUBLISH ? " (published)" : ""}`,
      actorName: organizer.name,
      actorId: organizer.id,
    },
  });

  console.log(
    `Done. The home page picks it up within 60s (public cache TTL). Roster: /admin/events/${EVENT_ID}`,
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
