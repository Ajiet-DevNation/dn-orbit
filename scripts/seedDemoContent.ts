// scripts/seedDemoContent.ts — replace the joke test content in the live
// database with a coherent, presentable DevNation dataset.
//
// ── Why this is a script and not a one-off SQL session ────────────────────────
// The content it writes is *demo* content: it has to be re-runnable when someone
// edits an event in the admin panel and wants the canonical copy back, and it
// has to be reviewable in a pull request before it touches production. Both need
// the dataset to live in version control, so this file is the source of truth
// and the database is the projection of it.
//
// ── Safety model ─────────────────────────────────────────────────────────────
//  1. Every destructive step writes a full JSON snapshot of the affected rows to
//     .backups/ BEFORE deleting anything. Nothing here is unrecoverable.
//  2. Junk events and projects are purged by EXPLICIT ID, never by a predicate,
//     so a typo can't widen the blast radius to real rows.
//  3. Audit-log purging is the one predicate-based deletion; it prints every
//     matched line so the operator can see exactly what went.
//  4. `--dry-run` resolves and prints the entire plan without writing.
//
// ── Idempotency ──────────────────────────────────────────────────────────────
// Seeded rows get deterministic UUIDv5 ids derived from a stable slug, and every
// write is an upsert. Running this twice is the same as running it once. Real
// rows the club created (member accounts, GitHub/LeetCode stats, the allowlist)
// are never touched.
//
// Usage:
//   bun run seed:demo -- --dry-run     # print the plan, write nothing
//   bun run seed:demo                  # purge + seed + recompute leaderboard
//   bun run seed:demo -- --purge-only  # purge junk, seed nothing
//   bun run seed:demo -- --skip-storage # leave orphaned Supabase objects alone

import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import type { FormFieldDef } from "@/lib/forms";
import { recomputeLeaderboardScores } from "@/lib/leaderboard";
import { MEDIA_BUCKET } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const PURGE_ONLY = argv.includes("--purge-only");
const SEED_ONLY = argv.includes("--seed-only");
const SKIP_STORAGE = argv.includes("--skip-storage");

function log(...parts: unknown[]) {
  console.log(...parts);
}
function step(title: string) {
  log(`\n─── ${title} ${"─".repeat(Math.max(0, 68 - title.length))}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic ids
// ─────────────────────────────────────────────────────────────────────────────
// Seeded rows need stable primary keys so re-running upserts instead of
// duplicating. UUIDv5 (RFC 4122 §4.3) gives that: same slug in, same uuid out,
// and the output is a real UUID rather than a hand-rolled string — so the ids
// stay indistinguishable in shape from the ones `@default(uuid())` produces and
// would survive the id columns ever being tightened to `@db.Uuid`.

const DEMO_NAMESPACE = "4f1c0c9a-3b2e-4d5a-8f61-9c7b0e2a4d38";

function uuidv5(name: string, namespace: string): string {
  const ns = Buffer.from(namespace.replace(/-/g, ""), "hex");
  const digest = createHash("sha1").update(ns).update(name, "utf8").digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

/** Stable id for a seeded row, keyed by a human-readable slug. */
const id = (slug: string) => uuidv5(slug, DEMO_NAMESPACE);

// Deterministic "randomness". Attendance, feedback ratings and comment choices
// must look varied but land identically on every run, otherwise a re-run would
// silently reshuffle the leaderboard's event component.
function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function pick<T>(arr: readonly T[], key: string): T {
  return arr[hash32(key) % arr.length] as T;
}
function chance(key: string, percent: number): boolean {
  return hash32(key) % 100 < percent;
}

/** UTC-carried date builder. See the timezone note under EVENTS. */
const at = (iso: string) => new Date(iso);

// Prisma's Json column inputs reject a plain object or array literal, so values
// are widened at the write boundary — the same idiom lib/event-payload.ts uses
// (`asJson`). Shape is guaranteed by the FormFieldDef / Milestone types in this
// file, not by Prisma.
type NullableJson = Prisma.InputJsonValue | typeof Prisma.DbNull;
const asJson = (v: unknown) => v as Prisma.InputJsonValue;
const asNullableJson = (v: unknown): NullableJson =>
  (v ?? Prisma.DbNull) as NullableJson;

// ─────────────────────────────────────────────────────────────────────────────
// JUNK — purged by explicit id
// ─────────────────────────────────────────────────────────────────────────────

const JUNK_EVENTS: { id: string; title: string; why: string }[] = [
  {
    id: "a13646b0-63dc-4dc5-8f49-f1ab37a8b3a5",
    title: "CTF Challenge 2026",
    why: "abandoned first draft of 'Capture The Flag'; its own body contradicted its event date",
  },
  {
    id: "0544da19-5aa2-495b-a77c-1d69f82dac60",
    title: "testi",
    why: 'test row — keyboard-mash description, location "jizzle\'s house"',
  },
  {
    id: "6712fa87-3a6e-4b0d-b647-d5b74eb775e9",
    title: "freakoff",
    why: "joke event",
  },
  {
    id: "4f1ba690-8361-4885-9a6b-9ab9367647dc",
    title: "HACKINTWAHA",
    why: "joke event; banner was a zoomed photo of a member's face",
  },
  {
    id: "ebb66c38-f421-4e65-b144-7b3b78aa6a8c",
    title: "TechSnake",
    why: 'duplicate of SnakeByte; location "sleep sleep", watermarked stock banner',
  },
  {
    id: "5b1a7e9c-f31d-4ad1-9880-80838a4fe2d1",
    title: "TechSnakes",
    why: "unpublished duplicate of SnakeByte",
  },
  {
    id: "8702a87a-83e6-4765-afab-e459a135235e",
    title: "TechSnakes",
    why: "second duplicate of SnakeByte",
  },
  {
    id: "58865fc2-1e93-4343-8dfe-b791b770900a",
    title: "RateTheGothGirl",
    why: "joke event",
  },
  {
    id: "79288299-6542-4429-a404-580cc13e9739",
    title: "zdfhbdafzdsfgb",
    why: "keyboard-mash test row dated year 5364",
  },
  {
    id: "9626c2ef-7179-4e01-a0da-0903ab47c0d2",
    title: "Touch'em",
    why: 'test row — 2 KB of mashed keys, location "Epstein Island"',
  },
];

const JUNK_PROJECTS: { id: string; title: string; why: string }[] = [
  {
    id: "bd0f1779-16e2-4383-9d85-51cb5811fe48",
    title: "DHUL IS SPOODERMAN!!!!!",
    why: "joke project about a member; repo link pointed at a YouTube video",
  },
  {
    id: "e7cc569a-8c25-4e65-b138-0409dc6e3991",
    title: "DHUL..SPOODERMAN???",
    why: "duplicate joke project",
  },
  {
    id: "3100ef8b-f65f-407d-8821-eeb7dbdf1ceb",
    title: "InsideTwaha",
    why: "joke project; repo link was a rickroll",
  },
  {
    id: "603cad34-08f4-453f-85bd-a4ba6c1e1024",
    title: "mogmaxxing",
    why: "joke project",
  },
  {
    id: "75043ea3-45cb-4f39-aead-b6bb4fcd36cf",
    title: "The huzz repellent",
    why: "joke project; repo does not exist",
  },
  {
    id: "b1400e15-44b1-41bd-adf6-4b24e5dd4f40",
    title: "The HUZZFINDER",
    why: "joke project; repo does not exist",
  },
];

// Registrations on events we KEEP but whose rosters were filled with test rows
// ("eryserty", "gghgghgghghhgh", …). Wiping the roster is safer than trying to
// sort real entries from mashed ones, and both events are still in the future.
const EVENTS_WITH_ROSTER_RESET: { id: string; title: string }[] = [
  { id: "1a546a98-e615-40d0-9a7f-0a2165fa0699", title: "Capture The Flag" },
  {
    id: "fac80322-56f5-4c12-a5df-dfbf12e264bc",
    title: "DevNation Inauguration Ceremony",
  },
];

// Audit-log lines that name deleted joke content. Matched as case-sensitive
// substrings of `summary`; every hit is printed before deletion.
const JUNK_AUDIT_PHRASES = [
  "SPOODERMAN",
  "Mama Coco Real?",
  "Touch'em",
  "zdfhbdafzdsfgb",
  '"testi"',
  "TechSnake",
  "RateTheGothGirl",
  "HACKINTWAHA",
  "freakoff",
  "Albert Epstien",
  "chiwawa",
  "InsideTwaha",
  "mogmaxxing",
  "huzz",
  "HUZZFINDER",
];

// Supabase Storage objects that become unreferenced once the rows above go. The
// two banners and one screenshot worth keeping are deliberately absent from this
// list: media/events/839a4a1d… (the "CAPTURE THE FLAG" title card),
// media/events/21c978dc… (the pixel DevNation logo) and
// media/projects/ccc2d677… (a real AgentOPSYN screenshot).
const ORPHANED_STORAGE_OBJECTS = [
  "events/0f675ca4-c9c5-4796-ad17-52371127a6ed.webp", // HACKINTWAHA — member's face
  "events/0c8d96d1-10e2-4716-9b0b-533464a872c1.webp", // TechSnake — watermarked stock art
  "events/a6a67d0d-8259-4e09-8c1a-cef0f0dc9ca7.webp", // RateTheGothGirl
  "events/e00ee290-4685-4962-8efd-626dcd485f2f.webp", // zdfhbdafzdsfgb — anime art
  "events/2742fba5-f4d6-40f0-99f4-a8b58bc904a6.webp", // Touch'em
  "events/796299f5-bd8a-47c3-a0c3-8b4fdf24e631.webp", // DevToHack — anime fan art
  "projects/548baf4d-026e-4cc1-8abd-517c185aa23e.webp", // SPOODERMAN composite
  "projects/743969f4-fdc6-45be-8f46-0cf9e7aafca7.webp", // SPOODERMAN composite
  "projects/7fe55eef-1a94-4c10-9802-557f219242c7.webp", // InsideTwaha
  "projects/b521990a-d2b7-4697-8726-d45c94720eda.webp", // mogmaxxing
];

// Banners kept on salvaged events.
const CTF_BANNER =
  "https://evzyxuphcuexlmucbzmm.supabase.co/storage/v1/object/public/media/events/839a4a1d-ce76-4e44-8faa-9a00b5d047b4.webp";
const DN_LOGO_BANNER =
  "https://evzyxuphcuexlmucbzmm.supabase.co/storage/v1/object/public/media/events/21c978dc-1993-4cee-83af-46ff29f1e44c.webp";
const AGENTOPSYN_IMAGE =
  "https://evzyxuphcuexlmucbzmm.supabase.co/storage/v1/object/public/media/projects/ccc2d677-6958-4322-8bc3-1002c99cf8a2.webp";

// ─────────────────────────────────────────────────────────────────────────────
// Registration form schemas
// ─────────────────────────────────────────────────────────────────────────────
// Field ids are derived from the event slug so they are stable across runs — a
// registrant's stored `responses` are keyed by field id, so regenerating a
// schema with fresh ids would orphan every answer already collected.

const BRANCH_OPTIONS = ["CSE", "ISE", "AIML", "AIDS"];
const YEAR_OPTIONS = ["1st", "2nd", "3rd", "4th"];

type StdKey = "name" | "email" | "phone" | "usn" | "branch" | "year";
const stdField = (slug: string, key: StdKey) => id(`field:${slug}:${key}`);

/**
 * The question set almost every event asks. Kept in one place so a change to
 * (say) the branch list lands on every event at once instead of drifting.
 */
function standardSchema(
  slug: string,
  opts?: { phone?: boolean },
): FormFieldDef[] {
  const fields: FormFieldDef[] = [
    {
      id: stdField(slug, "name"),
      type: "short_text",
      label: "Full name",
      required: true,
      placeholder: "As it should appear on your certificate",
    },
    {
      id: stdField(slug, "email"),
      type: "email",
      label: "Email address",
      required: true,
    },
  ];
  if (opts?.phone !== false) {
    fields.push({
      id: stdField(slug, "phone"),
      type: "number",
      label: "Phone number",
      required: true,
      description: "Used only for day-of coordination.",
    });
  }
  fields.push(
    {
      id: stdField(slug, "usn"),
      type: "short_text",
      label: "USN",
      required: true,
      placeholder: "4JK00XX000",
    },
    {
      id: stdField(slug, "branch"),
      type: "dropdown",
      label: "Branch",
      required: true,
      options: BRANCH_OPTIONS,
    },
    {
      id: stdField(slug, "year"),
      type: "dropdown",
      label: "Year of study",
      required: true,
      options: YEAR_OPTIONS,
    },
  );
  return fields;
}

// ── Salvaged events keep their original field ids ────────────────────────────
// SnakeByte and DevToHack 2027 already hold real registrations whose responses
// are keyed by these ids, so they are hardcoded rather than derived.

const SNAKEBYTE_FIELDS = {
  name: "1f56a3de-45d1-41cd-a2ab-9b0f34a6723b",
  email: "16ecbd7a-b571-4bd1-9b15-2717d1b97d71",
  phone: "d5a83cf2-e442-487b-9938-d18c427980eb",
  usn: "8a55c765-234f-4473-bd3c-0af44e0eadf7",
  branch: "8ba62617-4ca3-4434-bde0-247b1790145f",
  year: "42095823-8397-471d-a834-08531cbf43ee",
} as const;

const SNAKEBYTE_SCHEMA: FormFieldDef[] = [
  {
    id: SNAKEBYTE_FIELDS.name,
    type: "short_text",
    label: "Full name",
    required: true,
  },
  {
    id: SNAKEBYTE_FIELDS.email,
    type: "email",
    label: "Email address",
    required: true,
  },
  {
    id: SNAKEBYTE_FIELDS.phone,
    type: "number",
    label: "Phone number",
    required: true,
  },
  {
    id: SNAKEBYTE_FIELDS.usn,
    type: "short_text",
    label: "USN",
    required: true,
  },
  {
    id: SNAKEBYTE_FIELDS.branch,
    type: "dropdown",
    label: "Branch",
    required: true,
    options: BRANCH_OPTIONS,
  },
  {
    id: SNAKEBYTE_FIELDS.year,
    type: "dropdown",
    label: "Year of study",
    required: true,
    options: YEAR_OPTIONS,
  },
];

const DEVTOHACK_FIELDS = {
  name: "94e48456-017d-4f98-896a-dca08ad68034",
  college: "b57c522a-b09a-4d01-bf73-47bfae982bc6",
  email: "cce806f6-8c07-43d4-a0f0-306d2b75900f",
  phone: "9ddddc1a-13c5-4120-90da-cc237e3dec44",
  entryType: "e2428779-a288-4280-912b-ae79a8552099",
  // New questions — safe to derive, nothing has answered them yet.
  track: id("field:devtohack-2027:track"),
  teamName: id("field:devtohack-2027:team-name"),
} as const;

const DEVTOHACK_SCHEMA: FormFieldDef[] = [
  {
    id: DEVTOHACK_FIELDS.name,
    type: "short_text",
    label: "Full name",
    required: true,
  },
  {
    id: DEVTOHACK_FIELDS.college,
    type: "short_text",
    label: "College / organisation",
    required: true,
  },
  {
    id: DEVTOHACK_FIELDS.email,
    type: "email",
    label: "Email address",
    required: true,
  },
  {
    id: DEVTOHACK_FIELDS.phone,
    type: "number",
    label: "Phone number",
    required: true,
  },
  {
    id: DEVTOHACK_FIELDS.entryType,
    type: "single_choice",
    label: "Are you registering as?",
    required: true,
    options: ["Individual", "Team"],
  },
  {
    // Conditional field — only asked of team entries. Exercises the form
    // builder's `visibleWhen` branch, which is otherwise unused in the DB.
    id: DEVTOHACK_FIELDS.teamName,
    type: "short_text",
    label: "Team name",
    required: true,
    visibleWhen: { fieldId: DEVTOHACK_FIELDS.entryType, equals: "Team" },
  },
  {
    id: DEVTOHACK_FIELDS.track,
    type: "dropdown",
    label: "Preferred track",
    required: true,
    options: ["Health", "FinTech", "Agriculture", "Open Innovation"],
  },
];

const INAUGURATION_SLUG = "inauguration-odd-2026";
const INAUGURATION_INTEREST = id(`field:${INAUGURATION_SLUG}:interest`);
const INAUGURATION_SCHEMA: FormFieldDef[] = [
  ...standardSchema(INAUGURATION_SLUG, { phone: false }),
  {
    id: INAUGURATION_INTEREST,
    type: "dropdown",
    label: "Which area interests you most?",
    description: "Helps us route you to the right module owner afterwards.",
    required: true,
    options: [
      "Web development",
      "Data structures & algorithms",
      "AI / Machine learning",
      "Cloud & DevOps",
      "Cybersecurity",
      "Design",
    ],
  },
];

const CTF_SLUG = "capture-the-flag-2026";
const CTF_FIELDS = {
  team: id(`field:${CTF_SLUG}:team`),
  size: id(`field:${CTF_SLUG}:size`),
  experience: id(`field:${CTF_SLUG}:experience`),
} as const;
const CTF_SCHEMA: FormFieldDef[] = [
  ...standardSchema(CTF_SLUG, { phone: false }),
  {
    id: CTF_FIELDS.team,
    type: "short_text",
    label: "Team name",
    required: true,
    placeholder: "Solo entries may use their own name",
  },
  {
    id: CTF_FIELDS.size,
    type: "dropdown",
    label: "Team size",
    required: true,
    options: ["1", "2", "3"],
  },
  {
    id: CTF_FIELDS.experience,
    type: "single_choice",
    label: "Have you played a CTF before?",
    description: "Used only to size the beginner primer session.",
    required: true,
    options: ["First time", "Played once or twice", "Regular player"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────────────────────
// TIMEZONE: lib/event-format.ts pins every formatter to UTC because the admin
// form collects a `datetime-local` wall-clock string. The stored instant is
// therefore the organizer's typed wall clock carried as UTC, and that is exactly
// what visitors see. So "10:00 AM" is written `T10:00:00Z`, not IST-converted.

type EventSeed = {
  slug: string;
  title: string;
  description: string;
  eventType: string;
  eventDate: Date;
  location: string | null;
  audience: "members" | "college" | "members_college" | "public";
  capacity: number | null;
  registrationDeadline: Date | null;
  bannerUrl: string | null;
  formSchema: FormFieldDef[] | null;
  /** githubUsername of the organizer. */
  createdBy: string;
  isPublished: boolean;
  reviewStatus: "pending" | "approved" | "rejected";
  /** githubUsername of the approver; null for pending events. */
  reviewedBy: string | null;
  createdAt: Date;
};

/** Events created fresh by this script. */
const NEW_EVENTS: EventSeed[] = [
  // ── Past: February → July 2026 ────────────────────────────────────────────
  {
    slug: "git-github-bootcamp",
    title: "Git & GitHub Bootcamp",
    description:
      "A hands-on introduction to version control for first and second year students, taking each participant from a fresh Git install to their first merged pull request on a DevNation practice repository.\n\nCovered in the session:\n• Installing and configuring Git, and setting up SSH keys\n• Staging, committing, and writing commit messages a reviewer can follow\n• Branching, merging, and resolving conflicts without panic\n• Forks, remotes, and the pull request workflow on GitHub\n• Reading a diff and leaving a useful review comment\n\nBring a laptop. No prior experience with version control is required.",
    eventType: "WORKSHOP",
    eventDate: at("2026-02-14T10:00:00Z"),
    location: "Seminar Hall 3, CSE Block",
    audience: "college",
    capacity: 90,
    registrationDeadline: at("2026-02-12T23:59:00Z"),
    bannerUrl: null,
    formSchema: standardSchema("git-github-bootcamp"),
    createdBy: "Twahaaa",
    isPublished: true,
    reviewStatus: "approved",
    reviewedBy: "MuazTPM-YT",
    createdAt: at("2026-01-28T09:12:00Z"),
  },
  {
    slug: "webdev-foundations",
    title: "Web Development Foundations",
    description:
      "A practical first look at how the web is built — HTML structure, CSS layout and JavaScript behaviour — ending with every participant deploying a personal portfolio page live to the internet.\n\nCovered in the session:\n• Semantic HTML and document structure\n• CSS layout with Flexbox and Grid, and responsive breakpoints\n• JavaScript fundamentals: the DOM, events and fetch\n• Deploying a static site to Vercel straight from a GitHub repository\n\nBring a laptop with a code editor installed. No prior web development experience is required.",
    eventType: "WORKSHOP",
    eventDate: at("2026-03-07T10:00:00Z"),
    location: "Computer Lab 2, ISE Block",
    audience: "college",
    capacity: 70,
    registrationDeadline: at("2026-03-05T23:59:00Z"),
    bannerUrl: null,
    formSchema: standardSchema("webdev-foundations"),
    createdBy: "khushikantaria310",
    isPublished: true,
    reviewStatus: "approved",
    reviewedBy: "Twahaaa",
    createdAt: at("2026-02-20T14:05:00Z"),
  },
  {
    slug: "dsa-sprint",
    title: "DSA Sprint: Arrays to Graphs",
    description:
      "A four-hour guided problem set that walks the core data structures in one sitting, with a live editorial after every round so participants leave understanding the pattern rather than just the answer.\n\nRounds:\n• Arrays, strings and two-pointer patterns\n• Hashing and prefix sums\n• Recursion, backtracking and trees\n• Graph traversal: BFS, DFS and shortest paths\n\nComplexity is analysed for every solution presented. A laptop and an online judge account are required.",
    eventType: "WORKSHOP",
    eventDate: at("2026-04-11T09:30:00Z"),
    location: "Seminar Hall 3, CSE Block",
    audience: "members_college",
    capacity: 60,
    registrationDeadline: at("2026-04-09T23:59:00Z"),
    bannerUrl: null,
    formSchema: standardSchema("dsa-sprint"),
    createdBy: "Arjun-333",
    isPublished: true,
    reviewStatus: "approved",
    reviewedBy: "Twahaaa",
    createdAt: at("2026-03-26T11:40:00Z"),
  },
  {
    slug: "open-source-day",
    title: "Open Source Day: Your First Pull Request",
    description:
      "An open contribution day where participants pick a real issue from the DevNation GitHub organisation, work it with a mentor beside them, and open a pull request before the session ends.\n\nWhat happens on the day:\n• Walkthrough of the organisation's repositories and their issue labels\n• Reading a codebase you did not write, and finding where a change belongs\n• Commit hygiene, branch naming and writing a pull request description\n• Responding to review feedback and getting a change merged\n\nMentors from the core team are on hand throughout. Bring a laptop with Git already configured.",
    eventType: "WORKSHOP",
    eventDate: at("2026-05-09T10:00:00Z"),
    location: "Computer Lab 1, CSE Block",
    audience: "college",
    capacity: 60,
    registrationDeadline: at("2026-05-07T23:59:00Z"),
    bannerUrl: null,
    formSchema: standardSchema("open-source-day"),
    createdBy: "Logizel",
    isPublished: true,
    reviewStatus: "approved",
    reviewedBy: "MuazTPM-YT",
    createdAt: at("2026-04-24T08:30:00Z"),
  },
  {
    slug: "ga-even-sem-2026",
    title: "General Assembly — Even Semester Review",
    description:
      "DevNation's end-of-semester general assembly: each module owner presents what shipped, what slipped and what carries into the next term, followed by an open floor for the whole club.\n\nAgenda:\n• Semester retrospective and membership report\n• Module updates from the leaderboard, events, projects and infrastructure owners\n• Review of the event calendar and attendance\n• Roadmap and ownership for the coming semester\n• Open floor\n\nAttendance is expected of all DevNation members.",
    eventType: "GENERAL_ASSEMBLY",
    eventDate: at("2026-06-06T15:00:00Z"),
    location: "Room 412, CSE Block",
    audience: "members",
    capacity: null,
    registrationDeadline: null,
    bannerUrl: null,
    formSchema: null,
    createdBy: "Twahaaa",
    isPublished: true,
    reviewStatus: "approved",
    reviewedBy: "MuazTPM-YT",
    createdAt: at("2026-05-25T10:15:00Z"),
  },
  {
    slug: "tech-talk-scale",
    title: "Tech Talk: Designing Systems That Scale",
    description:
      "An invited engineering session on what actually changes when a system grows from one server to many — caching, queues, database scaling, and the failure modes each of them introduces.\n\nTopics:\n• Where latency comes from, and how to measure it honestly\n• Caching strategies and the invalidation problems they create\n• Queues, backpressure and designing for retry\n• Read replicas, sharding and the real cost of consistency\n• How on-call teams reason about an incident while it is happening\n\nOpen to all AJIET students. No prior systems experience assumed.",
    eventType: "TECH_TALK",
    eventDate: at("2026-07-04T11:00:00Z"),
    location: "Main Auditorium",
    audience: "college",
    capacity: 150,
    registrationDeadline: at("2026-07-02T23:59:00Z"),
    bannerUrl: null,
    formSchema: standardSchema("tech-talk-scale", { phone: false }),
    createdBy: "MuazTPM-YT",
    isPublished: true,
    reviewStatus: "approved",
    reviewedBy: "Twahaaa",
    createdAt: at("2026-06-18T16:20:00Z"),
  },
  {
    slug: "codeathon-sprint",
    title: "Codeathon: Six-Hour Build Sprint",
    description:
      "Teams of three get one problem statement, six hours and no head start: the brief is revealed at the opening bell and judged the same evening on a working demo, code quality and a five-minute presentation.\n\nFormat:\n• Problem statement released at 9:00 AM; submissions close at 3:00 PM\n• Teams of up to three; any language or framework\n• Judged on working functionality, code quality and presentation\n• Mentors circulate for the first two hours only\n\nLaptops, chargers and extension boards are each team's own responsibility.",
    eventType: "CODEATHON",
    eventDate: at("2026-07-18T09:00:00Z"),
    location: "Computer Lab 1, CSE Block",
    audience: "members_college",
    capacity: 48,
    registrationDeadline: at("2026-07-16T23:59:00Z"),
    bannerUrl: null,
    formSchema: standardSchema("codeathon-sprint"),
    createdBy: "ANI-CPU-tech",
    isPublished: true,
    reviewStatus: "approved",
    reviewedBy: "Twahaaa",
    createdAt: at("2026-07-02T13:50:00Z"),
  },

  // ── Upcoming ──────────────────────────────────────────────────────────────
  {
    slug: "recruitment-odd-2026",
    title: "DevNation Recruitment Drive — Odd Semester 2026",
    description:
      "An open session for AJIET students who want to join DevNation: what the club actually does, how its nine modules are run, and what is expected of a member week to week.\n\nOn the agenda:\n• Introduction to DevNation and the current core team\n• Walkthrough of the modules and the projects each one owns\n• The ORBIT platform: leaderboard, events and project showcase\n• Selection process, timelines and time commitment\n• Question and answer with existing members\n\nOpen to all years and branches. Register with your USN to reserve a seat.",
    eventType: "MEETUP",
    eventDate: at("2026-08-08T11:00:00Z"),
    location: "Seminar Hall 3, CSE Block",
    audience: "college",
    capacity: 120,
    registrationDeadline: at("2026-08-07T23:59:00Z"),
    bannerUrl: null,
    formSchema: standardSchema("recruitment-odd-2026"),
    createdBy: "Twahaaa",
    isPublished: true,
    reviewStatus: "approved",
    reviewedBy: "MuazTPM-YT",
    createdAt: at("2026-07-21T09:05:00Z"),
  },
  {
    slug: "docker-cicd-workshop",
    title: "Containers to Production: Docker & CI/CD Workshop",
    description:
      "A hands-on workshop that takes a plain Node service from a Dockerfile to an automated deployment, covering images, layers, Compose and a GitHub Actions pipeline that builds and ships on every push.\n\nCovered in the session:\n• Writing a Dockerfile, and understanding layer caching\n• Multi-stage builds and keeping images small\n• Docker Compose for a service plus its database\n• GitHub Actions: build, test and deploy on push\n• Environment configuration and handling secrets\n\nBring a laptop with Docker Desktop or Docker Engine already installed.",
    eventType: "WORKSHOP",
    eventDate: at("2026-08-22T10:00:00Z"),
    location: "Computer Lab 2, ISE Block",
    audience: "college",
    capacity: 60,
    registrationDeadline: at("2026-08-20T23:59:00Z"),
    bannerUrl: null,
    formSchema: standardSchema("docker-cicd-workshop"),
    createdBy: "anysdefdefe",
    isPublished: true,
    reviewStatus: "approved",
    reviewedBy: "Twahaaa",
    createdAt: at("2026-07-24T12:35:00Z"),
  },
  {
    slug: "aiml-study-jam",
    title: "AI/ML Study Jam: Building with Transformers",
    description:
      'A guided study jam on modern language models: how attention works, what a pretrained checkpoint actually gives you, and how to fine-tune and evaluate one on a small dataset inside a notebook.\n\nCovered in the session:\n• From embeddings to attention, without the maths overhead\n• Tokenisers, checkpoints and what "pretrained" really means\n• Fine-tuning a small model on a labelled dataset\n• Evaluating honestly: baselines, splits and overfitting\n• Where inference cost comes from\n\nBasic Python and NumPy are assumed. A Google account is needed for the notebook.',
    eventType: "WORKSHOP",
    eventDate: at("2026-09-26T10:00:00Z"),
    location: "Seminar Hall 3, CSE Block",
    audience: "members_college",
    capacity: 60,
    registrationDeadline: at("2026-09-24T23:59:00Z"),
    bannerUrl: null,
    formSchema: standardSchema("aiml-study-jam"),
    createdBy: "iffahzohara057-coder",
    isPublished: true,
    reviewStatus: "approved",
    reviewedBy: "Twahaaa",
    createdAt: at("2026-07-26T15:10:00Z"),
  },
  {
    slug: "hacktoberfest-2026",
    title: "Hacktoberfest 2026 Kickoff",
    description:
      "DevNation's Hacktoberfest kickoff: an evening of pairing up, picking issues and getting a first pull request open against a real open-source project before October is a week old.\n\nOn the agenda:\n• How Hacktoberfest works, and what counts as a valid contribution\n• Finding beginner-friendly issues that are genuinely maintained\n• Etiquette: claiming an issue, scoping a change, talking to maintainers\n• Live contribution hour with mentors on hand\n\nOpen to all AJIET students. Bring a laptop with Git and a GitHub account ready.",
    eventType: "MEETUP",
    eventDate: at("2026-10-03T16:00:00Z"),
    location: "Seminar Hall 3, CSE Block",
    audience: "college",
    capacity: 100,
    registrationDeadline: at("2026-10-02T23:59:00Z"),
    bannerUrl: null,
    formSchema: standardSchema("hacktoberfest-2026", { phone: false }),
    createdBy: "pahimauchil",
    isPublished: true,
    reviewStatus: "approved",
    reviewedBy: "MuazTPM-YT",
    createdAt: at("2026-07-28T10:45:00Z"),
  },
  {
    // Deliberately left pending so Admin → Approvals has something in it.
    slug: "cp-intro",
    title: "Introduction to Competitive Programming",
    description:
      "A starter session on competitive programming: contest formats, how to read a problem statement quickly, and the small set of techniques that covers most beginner-division problems.\n\nCovered in the session:\n• Contest platforms, rating systems and how to pick your division\n• Reading constraints to infer the intended complexity\n• Standard library containers worth knowing by heart\n• Greedy, binary search and prefix-sum patterns\n• A practice plan for the month that follows\n\nFamiliarity with one programming language is assumed.",
    eventType: "WORKSHOP",
    eventDate: at("2026-11-28T10:00:00Z"),
    location: "Computer Lab 1, CSE Block",
    audience: "members_college",
    capacity: 50,
    registrationDeadline: at("2026-11-26T23:59:00Z"),
    bannerUrl: null,
    formSchema: standardSchema("cp-intro"),
    createdBy: "mohddhulkifl7-source",
    isPublished: false,
    reviewStatus: "pending",
    reviewedBy: null,
    createdAt: at("2026-07-29T18:20:00Z"),
  },
];

/**
 * Events already in the database that are worth keeping, with the fields this
 * script rewrites. Everything not listed here is left as the club set it.
 */
type EventPatch = {
  eventId: string;
  label: string;
  data: {
    title: string;
    description: string;
    eventType: string;
    eventDate: Date;
    location: string;
    audience: EventSeed["audience"];
    capacity: number;
    registrationDeadline: Date;
    bannerUrl: string | null;
    formSchema: FormFieldDef[];
    isPublished: boolean;
    reviewStatus: "approved";
  };
};

const SALVAGED_EVENTS: EventPatch[] = [
  {
    eventId: "412177dc-e09d-4c10-97f0-4a29191d2725",
    label: "SnakeByte",
    data: {
      title: "SnakeByte — DSA Snakes & Ladders",
      description:
        "A DevNation-only coding contest played on a Snakes and Ladders board where every square is a Data Structures and Algorithms problem: solve it to climb, miss it and slide back down.\n\nFormat:\n• Individual entry, three timed rounds\n• Problems span arrays, strings, recursion, trees and graphs\n• Ladders are awarded for the fastest correct submission on a square\n• The board is projected live throughout\n\nWinners receive DevNation certificates and leaderboard points. Bring a laptop and an online judge account.",
      eventType: "CODEATHON",
      eventDate: at("2026-08-19T14:00:00Z"),
      location: "Computer Lab 1, CSE Block",
      audience: "members",
      capacity: 48,
      // The stored deadline had already lapsed, which showed an upcoming event
      // as CLOSED on the public grid.
      registrationDeadline: at("2026-08-17T23:59:00Z"),
      bannerUrl: null,
      formSchema: SNAKEBYTE_SCHEMA,
      isPublished: true,
      reviewStatus: "approved",
    },
  },
  {
    eventId: "1a546a98-e615-40d0-9a7f-0a2165fa0699",
    label: "Capture The Flag",
    data: {
      title: "Capture The Flag 2026",
      description:
        "DevNation's annual Capture The Flag competition — a jeopardy-style board of security challenges, a live scoreboard, and a beginner track in every category so first-timers can score too.\n\nCategories:\n• Cryptography and classical ciphers\n• Web exploitation basics\n• Reverse engineering\n• Forensics and steganography\n• Logic puzzles and open-source intelligence\n\nTeams of up to three. A 30-minute primer runs before the start for anyone new to CTFs, and certificates go to the top three teams.",
      eventType: "CODEATHON",
      eventDate: at("2026-09-15T09:15:00Z"),
      location: "Seminar Hall 3, CSE Block",
      audience: "members_college",
      capacity: 60,
      registrationDeadline: at("2026-09-13T23:59:00Z"),
      bannerUrl: CTF_BANNER,
      formSchema: CTF_SCHEMA,
      isPublished: true,
      reviewStatus: "approved",
    },
  },
  {
    eventId: "fac80322-56f5-4c12-a5df-dfbf12e264bc",
    label: "DevNation Inauguration Ceremony",
    data: {
      title: "DevNation Inauguration — Odd Semester 2026",
      description:
        "The formal inauguration of DevNation's odd-semester programme, introducing this year's core team and module owners and demonstrating ORBIT — the platform the club built to run its own leaderboard, events and project showcase.\n\nAgenda:\n• Welcome address and faculty remarks\n• Introduction of the core team and module owners\n• Live walkthrough of the ORBIT platform\n• Semester roadmap, and how students can get involved\n• Open floor\n\nOpen to all AJIET students. Register with your USN to reserve a seat.",
      eventType: "MEETUP",
      eventDate: at("2026-11-12T09:00:00Z"),
      location: "Room 412, CSE Block",
      audience: "college",
      capacity: 120,
      registrationDeadline: at("2026-11-10T23:59:00Z"),
      bannerUrl: DN_LOGO_BANNER,
      formSchema: INAUGURATION_SCHEMA,
      isPublished: true,
      reviewStatus: "approved",
    },
  },
  {
    eventId: "d5b2ac58-8f9e-43bf-82d4-cc6d3c71df13",
    label: "DevToHack 2027",
    data: {
      title: "DevToHack 2027",
      description:
        "DevToHack 2027 is DevNation's national-level 36-hour hackathon: an online qualifier round, an on-campus grand finale, and four problem tracks judged by a panel from industry.\n\nTracks:\n• Health\n• FinTech\n• Agriculture\n• Open Innovation\n\nFormat:\n• Teams of up to four, or individual entries\n• Online qualifier, followed by a 36-hour on-campus finale\n• Judged on problem fit, technical execution and the final demo\n\nOpen to students, working professionals and startup teams from across the country.",
      eventType: "HACKATHON",
      eventDate: at("2027-09-18T09:00:00Z"),
      location: "AJIET Mangaluru — online qualifiers + on-campus finale",
      audience: "public",
      capacity: 300,
      registrationDeadline: at("2027-09-10T23:59:00Z"),
      // Was anime fan art; the pixel-glyph fallback is on-brand and the object
      // is deleted from storage below.
      bannerUrl: null,
      formSchema: DEVTOHACK_SCHEMA,
      isPublished: true,
      reviewStatus: "approved",
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────
// Which members registered for which past event, and which of those they
// actually attended. The leaderboard's event component is
// `attended / published-past-events`, so these lists are what makes the EVT
// column on the public board non-zero — they are declared explicitly rather
// than generated so the resulting standings are reviewable here in the diff.

const PAST_SLUGS = [
  "git-github-bootcamp",
  "webdev-foundations",
  "dsa-sprint",
  "open-source-day",
  "ga-even-sem-2026",
  "tech-talk-scale",
  "codeathon-sprint",
] as const;

type PastSlug = (typeof PAST_SLUGS)[number];

const MEMBER_ATTENDANCE: Record<
  string,
  { attended: PastSlug[]; noShow?: PastSlug[] }
> = {
  Twahaaa: {
    attended: [
      "git-github-bootcamp",
      "webdev-foundations",
      "dsa-sprint",
      "open-source-day",
      "ga-even-sem-2026",
      "tech-talk-scale",
      "codeathon-sprint",
    ],
  },
  "MuazTPM-YT": {
    attended: [
      "git-github-bootcamp",
      "webdev-foundations",
      "dsa-sprint",
      "open-source-day",
      "ga-even-sem-2026",
      "codeathon-sprint",
    ],
    noShow: ["tech-talk-scale"],
  },
  Logizel: {
    attended: [
      "git-github-bootcamp",
      "webdev-foundations",
      "dsa-sprint",
      "open-source-day",
      "ga-even-sem-2026",
      "tech-talk-scale",
    ],
    noShow: ["codeathon-sprint"],
  },
  "ANI-CPU-tech": {
    attended: [
      "git-github-bootcamp",
      "dsa-sprint",
      "open-source-day",
      "ga-even-sem-2026",
      "codeathon-sprint",
    ],
    noShow: ["webdev-foundations"],
  },
  khushikantaria310: {
    attended: [
      "git-github-bootcamp",
      "webdev-foundations",
      "dsa-sprint",
      "ga-even-sem-2026",
      "codeathon-sprint",
    ],
    noShow: ["open-source-day"],
  },
  "Arjun-333": {
    attended: [
      "git-github-bootcamp",
      "webdev-foundations",
      "dsa-sprint",
      "open-source-day",
      "codeathon-sprint",
    ],
    noShow: ["ga-even-sem-2026"],
  },
  ShafeelxAhmed: {
    attended: [
      "git-github-bootcamp",
      "webdev-foundations",
      "ga-even-sem-2026",
      "tech-talk-scale",
    ],
    noShow: ["dsa-sprint"],
  },
  jiwatec: {
    attended: [
      "git-github-bootcamp",
      "webdev-foundations",
      "dsa-sprint",
      "ga-even-sem-2026",
    ],
    noShow: ["tech-talk-scale"],
  },
  "iffahzohara057-coder": {
    attended: [
      "git-github-bootcamp",
      "webdev-foundations",
      "open-source-day",
      "ga-even-sem-2026",
    ],
    noShow: ["dsa-sprint"],
  },
  pahimauchil: {
    attended: [
      "dsa-sprint",
      "open-source-day",
      "ga-even-sem-2026",
      "codeathon-sprint",
    ],
    noShow: ["tech-talk-scale"],
  },
  anysdefdefe: {
    attended: ["git-github-bootcamp", "ga-even-sem-2026", "codeathon-sprint"],
    noShow: ["dsa-sprint"],
  },
  purvivinayagam: {
    attended: ["webdev-foundations", "open-source-day", "ga-even-sem-2026"],
    noShow: ["tech-talk-scale"],
  },
  Aimaaaan: {
    attended: ["git-github-bootcamp", "webdev-foundations", "ga-even-sem-2026"],
    noShow: ["codeathon-sprint"],
  },
  "mohddhulkifl7-source": {
    attended: ["git-github-bootcamp", "ga-even-sem-2026"],
    noShow: ["webdev-foundations", "open-source-day"],
  },
  // Alumni attend the open tech talk only — they are no longer members, so the
  // members-only assembly is correctly out of reach for them.
  jtuluve: { attended: ["tech-talk-scale"] },
  gaureshpai: { attended: ["tech-talk-scale"] },
};

/** Members registered for upcoming events (nothing attended yet). */
const UPCOMING_MEMBER_SIGNUPS: Record<string, string[]> = {
  "snakebyte-existing": [
    "MuazTPM-YT",
    "Twahaaa",
    "ANI-CPU-tech",
    "Logizel",
    "khushikantaria310",
    "Arjun-333",
    "ShafeelxAhmed",
    "jiwatec",
    "iffahzohara057-coder",
    "pahimauchil",
    "anysdefdefe",
    "purvivinayagam",
    "Aimaaaan",
    "mohddhulkifl7-source",
  ],
  "ctf-existing": [
    "MuazTPM-YT",
    "Twahaaa",
    "ANI-CPU-tech",
    "Logizel",
    "khushikantaria310",
    "Arjun-333",
    "ShafeelxAhmed",
    "jiwatec",
    "iffahzohara057-coder",
    "pahimauchil",
  ],
  "inauguration-existing": [
    "Twahaaa",
    "MuazTPM-YT",
    "ANI-CPU-tech",
    "Logizel",
    "khushikantaria310",
    "iffahzohara057-coder",
    "jiwatec",
    "purvivinayagam",
  ],
  "aiml-study-jam": [
    "iffahzohara057-coder",
    "MuazTPM-YT",
    "Arjun-333",
    "ANI-CPU-tech",
    "purvivinayagam",
    "ShafeelxAhmed",
    "Aimaaaan",
  ],
  "docker-cicd-workshop": [
    "anysdefdefe",
    "pahimauchil",
    "Twahaaa",
    "MuazTPM-YT",
    "Logizel",
  ],
  "hacktoberfest-2026": [
    "pahimauchil",
    "Logizel",
    "MuazTPM-YT",
    "Twahaaa",
    "ANI-CPU-tech",
    "khushikantaria310",
    "jiwatec",
  ],
  // Muaz already had a real registration here; listing him re-normalises its
  // `responses` against the extended schema instead of leaving orphaned keys.
  "devtohack-existing": [
    "MuazTPM-YT",
    "Twahaaa",
    "ANI-CPU-tech",
    "Logizel",
    "anysdefdefe",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// AJIET student registrants (no platform account)
// ─────────────────────────────────────────────────────────────────────────────
// Public and college-audience events accept registrations from students who
// never sign in, and the organizer roster / CSV export is one of the surfaces
// worth showing off, so it needs rows in it.
//
// Addresses are USN-derived on the institute domain rather than invented
// personal mailboxes: the app sends no email anywhere (there is no mail
// dependency in package.json), and a USN-keyed institutional address cannot be
// mistaken for — or misdeliver to — a real person's private inbox.
//
// Phone numbers are a deliberately obvious synthetic sequence for the same
// reason: nothing in the app dials them, and a sequential block reads as sample
// data rather than as someone's real number.

const GUESTS: { name: string; usn: string }[] = [
  { name: "Aditi Shenoy", usn: "4JK24CS101" },
  { name: "Rohan Kamath", usn: "4JK24CS107" },
  { name: "Sneha Bhat", usn: "4JK24IS103" },
  { name: "Nikhil Poojary", usn: "4JK23CS118" },
  { name: "Ananya Rai", usn: "4JK23CI104" },
  { name: "Vishal Naik", usn: "4JK24AD106" },
  { name: "Meghana Hegde", usn: "4JK23IS109" },
  { name: "Karthik Prabhu", usn: "4JK25CS114" },
  { name: "Fathima Nasreen", usn: "4JK25CS121" },
  { name: "Sanjay Suvarna", usn: "4JK24IC102" },
  { name: "Divya Acharya", usn: "4JK23AD108" },
  { name: "Yashwanth Salian", usn: "4JK24CS129" },
  { name: "Ritika Pai", usn: "4JK25IS105" },
  { name: "Ibrahim Shariff", usn: "4JK23CS132" },
  { name: "Prathiksha Devadiga", usn: "4JK24CI111" },
  { name: "Akash Moger", usn: "4JK25CS137" },
  { name: "Swathi Karkera", usn: "4JK23IC107" },
  { name: "Manoj Kotian", usn: "4JK24IS112" },
  { name: "Neha Alva", usn: "4JK25AD103" },
  { name: "Sharath Ganiga", usn: "4JK23CS141" },
  { name: "Tanvi Shetty", usn: "4JK24CS135" },
  { name: "Faizan Ahmed", usn: "4JK25IS109" },
  { name: "Kavya Amin", usn: "4JK23CI115" },
  { name: "Deekshith Poojary", usn: "4JK24AD109" },
];

// Branch and year are derived from the USN so a persona can never contradict
// itself. Codes follow the ones already present in the real member rows.
const USN_BRANCH: Record<string, string> = {
  CS: "CSE",
  IS: "ISE",
  CI: "AIML",
  IC: "AIML",
  AD: "AIDS",
};
const USN_YEAR: Record<string, string> = {
  "23": "3rd",
  "24": "2nd",
  "25": "1st",
};

interface Guest {
  name: string;
  usn: string;
  email: string;
  branch: string;
  year: string;
  phone: number;
}

const GUEST_ROSTER: Guest[] = GUESTS.map((g, i) => {
  const admissionYear = g.usn.slice(3, 5);
  const branchCode = g.usn.slice(5, 7);
  return {
    name: g.name,
    usn: g.usn,
    email: `${g.usn.toLowerCase()}@ajiet.edu.in`,
    branch: USN_BRANCH[branchCode] ?? "CSE",
    year: USN_YEAR[admissionYear] ?? "2nd",
    phone: 9000000101 + i,
  };
});

/** How many AJIET students signed up per event, and where in the roster to start. */
const GUEST_PLAN: { slug: string; offset: number; count: number }[] = [
  { slug: "git-github-bootcamp", offset: 0, count: 16 },
  { slug: "webdev-foundations", offset: 4, count: 14 },
  { slug: "dsa-sprint", offset: 9, count: 10 },
  { slug: "open-source-day", offset: 2, count: 12 },
  { slug: "tech-talk-scale", offset: 6, count: 18 },
  { slug: "codeathon-sprint", offset: 13, count: 8 },
  { slug: "recruitment-odd-2026", offset: 0, count: 21 },
  { slug: "docker-cicd-workshop", offset: 11, count: 12 },
  { slug: "aiml-study-jam", offset: 5, count: 9 },
  { slug: "hacktoberfest-2026", offset: 15, count: 14 },
  { slug: "ctf-existing", offset: 8, count: 11 },
  { slug: "inauguration-existing", offset: 3, count: 17 },
  { slug: "devtohack-existing", offset: 18, count: 9 },
];

// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK
// ─────────────────────────────────────────────────────────────────────────────

const FEEDBACK_COMMENTS = [
  "Well paced, and the hands-on portion was the useful half.",
  "Good session. Would have liked another half hour for the exercises.",
  "Explanations were clear and the examples were relevant.",
  "Learned more here than in a week of tutorials. More of these please.",
  "Solid content. The room was a bit cramped for the number of people.",
  "The live walkthrough helped a lot — much better than slides alone.",
  "Practical and to the point. The takeaway material was genuinely useful.",
  "Started slightly late but the content made up for it.",
  "Mentors were patient with beginners, which made a real difference.",
  "Great structure. Please share the reference links afterwards.",
  "The problem set was well chosen — hard enough to matter, not impossible.",
  "Useful session; a short recap at the end would have helped it land.",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTS
// ─────────────────────────────────────────────────────────────────────────────

interface Milestone {
  label: string;
  done: boolean;
}

type ProjectSeed = {
  slug: string;
  /** Existing row to patch instead of creating, when the project is real. */
  existingId?: string;
  title: string;
  description: string;
  imageUrl: string | null;
  status: "planning" | "active" | "completed" | "stalled";
  githubRepoUrl: string | null;
  demoUrl: string | null;
  techStack: string[];
  milestones: Milestone[];
  reviewStatus: "pending" | "approved";
  /** githubUsername of the project lead. */
  lead: string;
  /** githubUsername → role on the project. The lead is added automatically. */
  members: Record<string, string>;
  reviewedBy: string | null;
  submittedAt: Date;
};

const PROJECTS: ProjectSeed[] = [
  {
    slug: "orbit",
    title: "ORBIT — DevNation Platform",
    description:
      "ORBIT is the platform DevNation runs on: a full-stack Next.js application that signs members in through GitHub, pulls their GitHub and LeetCode activity on a self-throttling refresh queue, and ranks the club on a weighted leaderboard the president can retune from the admin panel.\n\nIt also carries the club's operational surfaces — an events CMS with custom registration forms and attendance rosters, a public member directory, a project showcase with an approval workflow, and an append-only audit log, all behind role-based access control.",
    imageUrl: null,
    status: "active",
    githubRepoUrl: "https://github.com/Ajiet-DevNation/dn-orbit",
    demoUrl: "https://dn-orbit.vercel.app",
    techStack: [
      "Next.js",
      "React",
      "TypeScript",
      "PostgreSQL",
      "Prisma",
      "Tailwind",
      "Auth.js",
      "Vercel",
      "CI/CD",
    ],
    milestones: [
      { label: "Auth and onboarding via GitHub OAuth", done: true },
      { label: "GitHub statistics ingestion and caching", done: true },
      { label: "LeetCode statistics ingestion and caching", done: true },
      { label: "Weighted leaderboard scoring engine", done: true },
      { label: "Events CMS with custom registration forms", done: true },
      { label: "Public member directory", done: true },
      { label: "Admin panel with role-based access control", done: true },
      { label: "Project showcase with approval workflow", done: true },
      { label: "Public launch and faculty review", done: false },
    ],
    reviewStatus: "approved",
    lead: "MuazTPM-YT",
    members: {
      Twahaaa: "backend",
      "ANI-CPU-tech": "frontend",
      Logizel: "frontend",
      khushikantaria310: "frontend",
      anysdefdefe: "devops",
    },
    reviewedBy: "Twahaaa",
    submittedAt: at("2026-07-20T11:30:00Z"),
  },
  {
    slug: "agentopsyn",
    existingId: "70656c50-1b32-4b3b-a444-173db046c2ae",
    title: "AgentOPSYN",
    description:
      "Agent OPSYN is an AI-powered developer operations assistant that unifies fragmented engineering data into a single searchable vector index. It removes context-switching by working inside the editor, letting developers diagnose incidents, run safety-gated infrastructure commands, and generate runbooks that keep themselves up to date.\n\nThe assistant ingests repository history, incident timelines and integration webhooks, then answers natural-language questions about them with citations back to the source commit or alert.",
    imageUrl: AGENTOPSYN_IMAGE,
    status: "active",
    githubRepoUrl: "https://github.com/ANI-CPU-tech/AgentOPSYN",
    demoUrl: null,
    techStack: [
      "Python",
      "Django",
      "PostgreSQL",
      "Redis",
      "React",
      "TypeScript",
      "Docker",
      "REST API",
    ],
    milestones: [
      {
        label: "Vector index over repository and incident history",
        done: true,
      },
      { label: "Natural-language query interface", done: true },
      { label: "GitHub and Notion integration sync", done: false },
      { label: "Safety-gated infrastructure command execution", done: false },
      { label: "Self-updating runbook generation", done: false },
      { label: "Editor extension packaging", done: false },
    ],
    reviewStatus: "approved",
    lead: "ANI-CPU-tech",
    members: { "Arjun-333": "ml", "mohddhulkifl7-source": "backend" },
    reviewedBy: "MuazTPM-YT",
    submittedAt: at("2026-06-18T16:35:00Z"),
  },
  {
    slug: "docker-workshop-lab",
    title: "Docker Workshop Lab",
    description:
      "The lab material behind DevNation's containerisation workshop: a sample multi-service application, staged Dockerfiles, and a Compose setup that students break and repair as they work through the exercises.\n\nEvery exercise ships with a broken starting state and a written objective, so participants debug real container problems — bad layer ordering, missing environment configuration, a service that cannot reach its database — instead of copying a finished file.",
    imageUrl: null,
    status: "completed",
    githubRepoUrl: "https://github.com/Ajiet-DevNation/Docker-Workshop",
    demoUrl: null,
    techStack: ["Docker", "TypeScript", "Node.js", "Linux", "CI/CD"],
    milestones: [
      { label: "Sample multi-service application", done: true },
      { label: "Staged Dockerfile exercises", done: true },
      { label: "Compose setup with a database service", done: true },
      { label: "Continuous integration exercise", done: true },
      { label: "Workshop delivered and lab sheets published", done: true },
    ],
    reviewStatus: "approved",
    lead: "anysdefdefe",
    members: { pahimauchil: "devops" },
    reviewedBy: "Twahaaa",
    submittedAt: at("2026-05-02T09:20:00Z"),
  },
  {
    slug: "hackelite",
    title: "HackElite — Open Source Contribution Drive",
    description:
      "HackElite is DevNation's Hacktoberfest contribution drive: a curated repository of beginner-friendly issues that gives first-time contributors a real review cycle instead of a throwaway commit.\n\nMaintainers triage every incoming pull request, leave review feedback, and walk contributors through the changes needed to get merged. The repository has carried three contribution seasons and is still the club's standard on-ramp for students opening their first pull request.",
    imageUrl: null,
    status: "completed",
    githubRepoUrl: "https://github.com/Ajiet-DevNation/HackElite2023",
    demoUrl: null,
    techStack: ["C", "Python", "JavaScript", "Git", "Linux"],
    milestones: [
      { label: "Repository scaffolding and contribution guide", done: true },
      { label: "Curated beginner-friendly issue set", done: true },
      { label: "Maintainer review rotation", done: true },
      { label: "Hacktoberfest season run end to end", done: true },
      { label: "Contributor certificates issued", done: true },
    ],
    reviewStatus: "approved",
    lead: "gaureshpai",
    members: { jtuluve: "maintainer" },
    reviewedBy: "Twahaaa",
    submittedAt: at("2026-04-15T13:45:00Z"),
  },
  {
    // Left pending on purpose — gives Admin → Approvals a project to act on.
    slug: "campus-compass",
    title: "Campus Compass",
    description:
      "Campus Compass is an in-progress wayfinding app for the AJIET campus, built to answer the question every first-year asks in week one: where is this room, and which block is it in?\n\nThe plan is an offline-first mobile app with a floor-by-floor block map, a searchable directory of labs and staff rooms, and turn-by-turn walking directions between two points on campus. Currently at the design and data-collection stage.",
    imageUrl: null,
    status: "planning",
    githubRepoUrl: null,
    demoUrl: null,
    techStack: ["Flutter", "Python", "PostgreSQL", "REST API"],
    milestones: [
      { label: "Requirement gathering and student interviews", done: true },
      { label: "Block and floor map data collection", done: false },
      { label: "Offline map rendering prototype", done: false },
      { label: "Searchable room and staff directory", done: false },
      { label: "Walking directions between two points", done: false },
      { label: "Pilot release to first-year students", done: false },
    ],
    reviewStatus: "pending",
    lead: "iffahzohara057-coder",
    members: { jiwatec: "frontend" },
    reviewedBy: null,
    submittedAt: at("2026-07-26T17:05:00Z"),
  },
];

function progressFrom(milestones: Milestone[]): number {
  if (milestones.length === 0) return 0;
  const done = milestones.filter((m) => m.done).length;
  return Math.round((done / milestones.length) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Runtime
// ─────────────────────────────────────────────────────────────────────────────

type MemberRow = {
  id: string;
  name: string;
  email: string;
  usn: string | null;
  branch: string | null;
  year: number | null;
  githubUsername: string;
};

/** githubUsername (lowercased) → member row. */
type MemberIndex = Map<string, MemberRow>;

async function loadMembers(handles: string[]): Promise<MemberIndex> {
  const rows = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      usn: true,
      branch: true,
      year: true,
      githubUsername: true,
    },
  });
  const index: MemberIndex = new Map(
    rows.map((r) => [r.githubUsername.toLowerCase(), r]),
  );
  const missing = handles.filter((h) => !index.has(h.toLowerCase()));
  if (missing.length > 0) {
    throw new Error(
      `Seed aborted: no user row for ${missing.join(", ")}. ` +
        "The dataset references members by GitHub login; fix the handle or " +
        "remove them from the plan rather than letting the seed half-apply.",
    );
  }
  return index;
}

function member(index: MemberIndex, handle: string): MemberRow {
  const row = index.get(handle.toLowerCase());
  if (!row) throw new Error(`Unknown member handle: ${handle}`);
  return row;
}

const ordinal = (year: number | null): string =>
  year && year >= 1 && year <= 4 ? (YEAR_OPTIONS[year - 1] as string) : "3rd";

// ─── Backups ────────────────────────────────────────────────────────────────

async function writeBackup(payload: unknown): Promise<string> {
  const dir = path.join(process.cwd(), ".backups");
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `seed-demo-${stamp}.json`);
  await writeFile(file, JSON.stringify(payload, null, 2), "utf8");
  return file;
}

// ─── Purge ──────────────────────────────────────────────────────────────────

async function purge() {
  const junkEventIds = JUNK_EVENTS.map((e) => e.id);
  const junkProjectIds = JUNK_PROJECTS.map((p) => p.id);
  const resetEventIds = EVENTS_WITH_ROSTER_RESET.map((e) => e.id);

  // Resolve everything first so the backup is a faithful "before" picture and
  // the dry run can show exactly what would go.
  const [events, projects, resetRegistrations, auditRows] = await Promise.all([
    db.event.findMany({
      where: { id: { in: junkEventIds } },
      include: { registrations: true, feedback: true },
    }),
    db.project.findMany({
      where: { id: { in: junkProjectIds } },
      include: { members: true },
    }),
    db.registration.findMany({ where: { eventId: { in: resetEventIds } } }),
    db.auditLog.findMany({
      where: {
        OR: JUNK_AUDIT_PHRASES.map((p) => ({ summary: { contains: p } })),
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const foundEventIds = new Set(events.map((e) => e.id));
  for (const e of JUNK_EVENTS) {
    if (!foundEventIds.has(e.id)) {
      log(`  · already gone: event "${e.title}"`);
    }
  }
  const foundProjectIds = new Set(projects.map((p) => p.id));
  for (const p of JUNK_PROJECTS) {
    if (!foundProjectIds.has(p.id)) {
      log(`  · already gone: project "${p.title}"`);
    }
  }

  log(`\n  Events to delete (${events.length}):`);
  for (const e of events) {
    const meta = JUNK_EVENTS.find((j) => j.id === e.id);
    log(
      `    ✗ ${e.title}  [${e.registrations.length} registrations, ${e.feedback.length} feedback]`,
    );
    log(`        reason: ${meta?.why}`);
  }

  log(`\n  Projects to delete (${projects.length}):`);
  for (const p of projects) {
    const meta = JUNK_PROJECTS.find((j) => j.id === p.id);
    log(`    ✗ ${p.title}  [${p.members.length} project members]`);
    log(`        reason: ${meta?.why}`);
  }

  log(`\n  Roster resets (${resetRegistrations.length} registrations):`);
  for (const e of EVENTS_WITH_ROSTER_RESET) {
    const n = resetRegistrations.filter((r) => r.eventId === e.id).length;
    log(`    ✗ ${e.title}: ${n} rows (re-seeded below)`);
  }

  log(`\n  Audit lines to delete (${auditRows.length}):`);
  for (const r of auditRows) {
    log(`    ✗ [${r.createdAt.toISOString().slice(0, 10)}] ${r.summary}`);
  }

  if (DRY_RUN) {
    log("\n  --dry-run: nothing written.");
    return;
  }

  const backup = await writeBackup({
    takenAt: new Date().toISOString(),
    deletedEvents: events,
    deletedProjects: projects,
    resetRegistrations,
    deletedAuditLogs: auditRows,
  });
  log(`\n  Backup written to ${path.relative(process.cwd(), backup)}`);

  // Registrations and feedback cascade from Event; project members cascade from
  // Project (see the schema's onDelete rules), so these two deletes are enough.
  const delEvents = await db.event.deleteMany({
    where: { id: { in: junkEventIds } },
  });
  const delProjects = await db.project.deleteMany({
    where: { id: { in: junkProjectIds } },
  });
  const delRegs = await db.registration.deleteMany({
    where: { eventId: { in: resetEventIds } },
  });
  const delAudit = await db.auditLog.deleteMany({
    where: { id: { in: auditRows.map((r) => r.id) } },
  });

  log(
    `  Deleted: ${delEvents.count} events, ${delProjects.count} projects, ` +
      `${delRegs.count} roster rows, ${delAudit.count} audit lines.`,
  );
}

// ─── Seed: events ───────────────────────────────────────────────────────────

async function seedEvents(members: MemberIndex) {
  for (const e of NEW_EVENTS) {
    const eventId = id(`event:${e.slug}`);
    const creator = member(members, e.createdBy);
    const reviewer = e.reviewedBy ? member(members, e.reviewedBy) : null;

    const data = {
      title: e.title,
      description: e.description,
      eventType: e.eventType,
      eventDate: e.eventDate,
      location: e.location,
      audience: e.audience,
      capacity: e.capacity,
      registrationDeadline: e.registrationDeadline,
      bannerUrl: e.bannerUrl,
      // `formSchema` is a nullable Json column: Prisma needs DbNull to write SQL
      // NULL. Passing `undefined` would instead mean "leave unchanged", so an
      // event whose questions were removed from the plan would keep its old
      // schema forever.
      formSchema: asNullableJson(e.formSchema),
      isPublished: e.isPublished,
      reviewStatus: e.reviewStatus,
      createdBy: creator.id,
      reviewedById: reviewer?.id ?? null,
      reviewedAt: reviewer
        ? new Date(e.createdAt.getTime() + 40 * 60_000)
        : null,
      createdAt: e.createdAt,
    };

    if (DRY_RUN) {
      log(`    + ${e.title}  (${e.eventDate.toISOString().slice(0, 10)})`);
      continue;
    }
    await db.event.upsert({
      where: { id: eventId },
      create: { id: eventId, ...data },
      update: data,
    });
    log(`    ✓ ${e.title}`);
  }
}

async function patchSalvagedEvents() {
  for (const p of SALVAGED_EVENTS) {
    const existing = await db.event.findUnique({ where: { id: p.eventId } });
    if (!existing) {
      log(`    · skipped (row not found): ${p.label}`);
      continue;
    }
    if (DRY_RUN) {
      log(`    ~ ${p.label} → "${p.data.title}"`);
      continue;
    }
    await db.event.update({
      where: { id: p.eventId },
      data: { ...p.data, formSchema: asJson(p.data.formSchema) },
    });
    log(`    ✓ ${p.label} → "${p.data.title}"`);
  }
}

// ─── Seed: registrations, attendance, feedback ──────────────────────────────

/**
 * Resolve a plan slug to a live event id. Salvaged events are referenced by the
 * `*-existing` pseudo-slugs so the plan tables above stay readable.
 */
function eventIdFor(slug: string): string {
  switch (slug) {
    case "snakebyte-existing":
      return "412177dc-e09d-4c10-97f0-4a29191d2725";
    case "ctf-existing":
      return "1a546a98-e615-40d0-9a7f-0a2165fa0699";
    case "inauguration-existing":
      return "fac80322-56f5-4c12-a5df-dfbf12e264bc";
    case "devtohack-existing":
      return "d5b2ac58-8f9e-43bf-82d4-cc6d3c71df13";
    default:
      return id(`event:${slug}`);
  }
}

type SchemaShape =
  | { kind: "standard"; slug: string; phone: boolean }
  | { kind: "snakebyte" }
  | { kind: "devtohack" }
  | { kind: "ctf" }
  | { kind: "inauguration" }
  | { kind: "none" };

function schemaShapeFor(slug: string): SchemaShape {
  switch (slug) {
    case "snakebyte-existing":
      return { kind: "snakebyte" };
    case "devtohack-existing":
      return { kind: "devtohack" };
    case "ctf-existing":
      return { kind: "ctf" };
    case "inauguration-existing":
      return { kind: "inauguration" };
    case "ga-even-sem-2026":
      return { kind: "none" };
    default: {
      const seed = NEW_EVENTS.find((e) => e.slug === slug);
      const phone = (seed?.formSchema ?? []).some(
        (f) => f.id === stdField(slug, "phone"),
      );
      return { kind: "standard", slug, phone };
    }
  }
}

interface Registrant {
  name: string;
  email: string;
  usn: string | null;
  branch: string;
  year: string;
  phone: number;
  userId: string | null;
}

function responsesFor(
  shape: SchemaShape,
  r: Registrant,
  key: string,
): Record<string, unknown> {
  switch (shape.kind) {
    case "none":
      return {};
    case "standard": {
      const out: Record<string, unknown> = {
        [stdField(shape.slug, "name")]: r.name,
        [stdField(shape.slug, "email")]: r.email,
        [stdField(shape.slug, "usn")]: r.usn ?? "",
        [stdField(shape.slug, "branch")]: r.branch,
        [stdField(shape.slug, "year")]: r.year,
      };
      if (shape.phone) out[stdField(shape.slug, "phone")] = r.phone;
      return out;
    }
    case "snakebyte":
      return {
        [SNAKEBYTE_FIELDS.name]: r.name,
        [SNAKEBYTE_FIELDS.email]: r.email,
        [SNAKEBYTE_FIELDS.phone]: r.phone,
        [SNAKEBYTE_FIELDS.usn]: r.usn ?? "",
        [SNAKEBYTE_FIELDS.branch]: r.branch,
        [SNAKEBYTE_FIELDS.year]: r.year,
      };
    case "ctf": {
      const slug = CTF_SLUG;
      const teams = [
        "Segfault",
        "Null Terminated",
        "Off By One",
        "Rubber Ducks",
        "Stack Smashers",
        "Cache Money",
        "Kernel Panic",
        "Race Condition",
      ] as const;
      return {
        [stdField(slug, "name")]: r.name,
        [stdField(slug, "email")]: r.email,
        [stdField(slug, "usn")]: r.usn ?? "",
        [stdField(slug, "branch")]: r.branch,
        [stdField(slug, "year")]: r.year,
        [CTF_FIELDS.team]: pick(teams, `team:${key}`),
        [CTF_FIELDS.size]: pick(["1", "2", "3"], `size:${key}`),
        [CTF_FIELDS.experience]: pick(
          ["First time", "Played once or twice", "Regular player"],
          `exp:${key}`,
        ),
      };
    }
    case "inauguration": {
      const slug = INAUGURATION_SLUG;
      return {
        [stdField(slug, "name")]: r.name,
        [stdField(slug, "email")]: r.email,
        [stdField(slug, "usn")]: r.usn ?? "",
        [stdField(slug, "branch")]: r.branch,
        [stdField(slug, "year")]: r.year,
        [INAUGURATION_INTEREST]: pick(
          [
            "Web development",
            "Data structures & algorithms",
            "AI / Machine learning",
            "Cloud & DevOps",
            "Cybersecurity",
            "Design",
          ],
          `interest:${key}`,
        ),
      };
    }
    case "devtohack": {
      const entryType = pick(["Individual", "Team"], `entry:${key}`);
      const out: Record<string, unknown> = {
        [DEVTOHACK_FIELDS.name]: r.name,
        [DEVTOHACK_FIELDS.college]:
          "A J Institute of Engineering and Technology",
        [DEVTOHACK_FIELDS.email]: r.email,
        [DEVTOHACK_FIELDS.phone]: r.phone,
        [DEVTOHACK_FIELDS.entryType]: entryType,
        [DEVTOHACK_FIELDS.track]: pick(
          ["Health", "FinTech", "Agriculture", "Open Innovation"],
          `track:${key}`,
        ),
      };
      if (entryType === "Team") {
        out[DEVTOHACK_FIELDS.teamName] = pick(
          ["Team Meridian", "Bitwise", "Delta Force", "Loop Invariant"],
          `teamname:${key}`,
        );
      }
      return out;
    }
  }
}

async function upsertRegistration(args: {
  eventId: string;
  registrant: Registrant;
  attended: boolean;
  registeredAt: Date;
  responses: Record<string, unknown>;
  idKey: string;
}) {
  const { eventId, registrant, attended, registeredAt, responses, idKey } =
    args;
  const data = {
    userId: registrant.userId,
    name: registrant.name,
    email: registrant.email,
    usn: registrant.usn,
    responses: asJson(responses),
    attended,
    registeredAt,
  };
  await db.registration.upsert({
    // (eventId, email) is the natural key — it is what stops one person
    // registering twice — so upserting on it keeps this idempotent even for
    // rows the club created by hand.
    where: { eventId_email: { eventId, email: registrant.email } },
    create: { id: id(`reg:${idKey}`), eventId, ...data },
    update: data,
  });
}

/** Registration timestamp: a deterministic slot in the fortnight before the event. */
function signupTime(eventDate: Date, key: string): Date {
  const daysBefore = 2 + (hash32(`d:${key}`) % 12);
  const minutes = hash32(`m:${key}`) % (60 * 12);
  return new Date(
    eventDate.getTime() -
      daysBefore * 86_400_000 -
      minutes * 60_000 +
      9 * 3_600_000,
  );
}

async function seedRegistrations(members: MemberIndex) {
  let memberRows = 0;
  let guestRows = 0;
  let feedbackRows = 0;

  const eventDateOf = new Map<string, Date>();
  for (const e of NEW_EVENTS) eventDateOf.set(e.slug, e.eventDate);
  for (const p of SALVAGED_EVENTS) {
    const slug =
      p.eventId === "412177dc-e09d-4c10-97f0-4a29191d2725"
        ? "snakebyte-existing"
        : p.eventId === "1a546a98-e615-40d0-9a7f-0a2165fa0699"
          ? "ctf-existing"
          : p.eventId === "fac80322-56f5-4c12-a5df-dfbf12e264bc"
            ? "inauguration-existing"
            : "devtohack-existing";
    eventDateOf.set(slug, p.data.eventDate);
  }

  const asRegistrant = (m: MemberRow): Registrant => ({
    name: m.name,
    email: m.email,
    usn: m.usn,
    branch: m.branch ?? "CSE",
    year: ordinal(m.year),
    phone: 9000000001 + (hash32(m.id) % 90),
    userId: m.id,
  });

  // ── Past events: members, with attendance ────────────────────────────────
  for (const [handle, plan] of Object.entries(MEMBER_ATTENDANCE)) {
    const m = member(members, handle);
    const registrant = asRegistrant(m);
    const slugs: { slug: PastSlug; attended: boolean }[] = [
      ...plan.attended.map((s) => ({ slug: s, attended: true })),
      ...(plan.noShow ?? []).map((s) => ({ slug: s, attended: false })),
    ];

    for (const { slug, attended } of slugs) {
      const eventId = eventIdFor(slug);
      const eventDate = eventDateOf.get(slug);
      if (!eventDate) throw new Error(`No event date for slug ${slug}`);
      const key = `${slug}:${handle}`;

      if (!DRY_RUN) {
        await upsertRegistration({
          eventId,
          registrant,
          attended,
          registeredAt: signupTime(eventDate, key),
          responses: responsesFor(schemaShapeFor(slug), registrant, key),
          idKey: key,
        });
      }
      memberRows++;

      // Feedback only from people who actually turned up.
      if (attended && chance(`fb:${key}`, 65)) {
        const rating = chance(`r5:${key}`, 55)
          ? 5
          : chance(`r4:${key}`, 75)
            ? 4
            : 3;
        if (!DRY_RUN) {
          const fbData = {
            rating,
            comments: pick(FEEDBACK_COMMENTS, `c:${key}`),
            submittedAt: new Date(eventDate.getTime() + 6 * 3_600_000),
          };
          await db.feedback.upsert({
            where: { userId_eventId: { userId: m.id, eventId } },
            create: { id: id(`fb:${key}`), userId: m.id, eventId, ...fbData },
            update: fbData,
          });
        }
        feedbackRows++;
      }
    }
  }

  // ── Upcoming events: members, nothing attended ───────────────────────────
  for (const [slug, handles] of Object.entries(UPCOMING_MEMBER_SIGNUPS)) {
    const eventId = eventIdFor(slug);
    const eventDate = eventDateOf.get(slug);
    if (!eventDate) throw new Error(`No event date for slug ${slug}`);
    for (const handle of handles) {
      const m = member(members, handle);
      const key = `${slug}:${handle}`;
      if (!DRY_RUN) {
        const registrant = asRegistrant(m);
        await upsertRegistration({
          eventId,
          registrant,
          attended: false,
          registeredAt: signupTime(eventDate, key),
          responses: responsesFor(schemaShapeFor(slug), registrant, key),
          idKey: key,
        });
      }
      memberRows++;
    }
  }

  // ── AJIET students without accounts ──────────────────────────────────────
  const now = new Date();
  for (const plan of GUEST_PLAN) {
    const eventId = eventIdFor(plan.slug);
    const eventDate = eventDateOf.get(plan.slug);
    if (!eventDate) throw new Error(`No event date for slug ${plan.slug}`);
    const isPast = eventDate < now;

    for (let i = 0; i < plan.count; i++) {
      const guest = GUEST_ROSTER[
        (plan.offset + i) % GUEST_ROSTER.length
      ] as Guest;
      const key = `${plan.slug}:${guest.usn}`;
      const registrant: Registrant = { ...guest, userId: null };
      // Roughly one in five no-shows on past events — a roster with 100%
      // attendance reads as fabricated.
      const attended = isPast && chance(`att:${key}`, 82);

      if (!DRY_RUN) {
        await upsertRegistration({
          eventId,
          registrant,
          attended,
          registeredAt: signupTime(eventDate, key),
          responses: responsesFor(schemaShapeFor(plan.slug), registrant, key),
          idKey: key,
        });
      }
      guestRows++;
    }
  }

  log(
    `    ${memberRows} member registrations, ${guestRows} AJIET-student ` +
      `registrations, ${feedbackRows} feedback rows.`,
  );
}

// ─── Seed: projects ─────────────────────────────────────────────────────────

async function seedProjects(members: MemberIndex) {
  for (const p of PROJECTS) {
    const projectId = p.existingId ?? id(`project:${p.slug}`);
    const lead = member(members, p.lead);
    const reviewer = p.reviewedBy ? member(members, p.reviewedBy) : null;
    const progressPct = progressFrom(p.milestones);

    const data = {
      leadId: lead.id,
      title: p.title,
      description: p.description,
      imageUrl: p.imageUrl,
      status: p.status,
      // Always derived, never hand-set — mirrors what the update route does, so
      // the meter can never disagree with the milestone list beside it.
      progressPct,
      githubRepoUrl: p.githubRepoUrl,
      demoUrl: p.demoUrl,
      techStack: asJson(p.techStack),
      milestones: asJson(p.milestones),
      reviewStatus: p.reviewStatus,
      reviewedById: reviewer?.id ?? null,
      reviewedAt: reviewer ? p.submittedAt : null,
      submittedAt: p.submittedAt,
    };

    if (DRY_RUN) {
      log(`    + ${p.title}  [${p.status}, ${progressPct}%]`);
      continue;
    }

    await db.project.upsert({
      where: { id: projectId },
      create: { id: projectId, ...data },
      update: data,
    });

    const roster: [string, string][] = [
      [p.lead, "lead"],
      ...Object.entries(p.members),
    ];
    for (const [handle, role] of roster) {
      const m = member(members, handle);
      await db.projectMember.upsert({
        where: { projectId_userId: { projectId, userId: m.id } },
        create: {
          id: id(`pm:${p.slug}:${handle}`),
          projectId,
          userId: m.id,
          role,
          joinedAt: p.submittedAt,
        },
        update: { role },
      });
    }
    log(
      `    ✓ ${p.title}  [${p.status}, ${progressPct}%, ${roster.length} members]`,
    );
  }
}

// ─── Seed: audit trail ──────────────────────────────────────────────────────
// The admin dashboard's activity feed is one of the surfaces on show, and it
// reads as broken when the only lines left are membership changes from June. So
// the seeded content gets the audit trail it would have produced had it been
// entered through the UI, timestamped to match.

async function seedAuditTrail(members: MemberIndex) {
  const entries: {
    key: string;
    action: string;
    summary: string;
    actor: string;
    at: Date;
  }[] = [];

  for (const e of NEW_EVENTS) {
    entries.push({
      key: `event.create:${e.slug}`,
      action: "event.create",
      summary: `Created event "${e.title}"`,
      actor: e.createdBy,
      at: e.createdAt,
    });
    if (e.reviewedBy) {
      entries.push({
        key: `event.approve:${e.slug}`,
        action: "event.approve",
        summary: `Approved event "${e.title}"`,
        actor: e.reviewedBy,
        at: new Date(e.createdAt.getTime() + 40 * 60_000),
      });
    }
  }

  for (const p of PROJECTS) {
    entries.push({
      key: `project.create:${p.slug}`,
      action: "project.create",
      summary: `Submitted project "${p.title}"`,
      actor: p.lead,
      at: p.submittedAt,
    });
    if (p.reviewedBy) {
      entries.push({
        key: `project.approve:${p.slug}`,
        action: "project.approve",
        summary: `Approved project "${p.title}"`,
        actor: p.reviewedBy,
        at: new Date(p.submittedAt.getTime() + 55 * 60_000),
      });
    }
  }

  for (const s of SALVAGED_EVENTS) {
    entries.push({
      key: `event.update:${s.eventId}`,
      action: "event.update",
      summary: `Updated event "${s.data.title}"`,
      actor: "MuazTPM-YT",
      at: at("2026-07-29T19:40:00Z"),
    });
  }

  // A few attendance-marking lines, so the feed is not only create/approve.
  for (const slug of PAST_SLUGS) {
    const seed = NEW_EVENTS.find((e) => e.slug === slug);
    if (!seed) continue;
    entries.push({
      key: `attendance:${slug}`,
      action: "event.attendance",
      summary: `Marked attendance for "${seed.title}"`,
      actor: seed.createdBy,
      at: new Date(seed.eventDate.getTime() + 5 * 3_600_000),
    });
  }

  for (const entry of entries) {
    const m = member(members, entry.actor);
    if (DRY_RUN) continue;
    const data = {
      action: entry.action,
      summary: entry.summary,
      actorId: m.id,
      actorName: m.name,
      createdAt: entry.at,
    };
    await db.auditLog.upsert({
      where: { id: id(`audit:${entry.key}`) },
      create: { id: id(`audit:${entry.key}`), ...data },
      update: data,
    });
  }

  log(`    ${entries.length} audit lines.`);
}

// ─── Storage ────────────────────────────────────────────────────────────────

/**
 * Storage client with env fallbacks.
 *
 * `lib/supabase.ts` reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_PRIVATE_KEY,
 * which is right for the app. A developer's local `.env` may predate that
 * naming (SUPABASE_SERVICE_ROLE_KEY) or omit the URL entirely because uploads
 * only happen in production — and this cleanup should not be blocked by that.
 * The URL falls back to the origin of the objects already recorded in the DB.
 */
async function storageClient() {
  const key =
    process.env.SUPABASE_PRIVATE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;

  let url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!url) {
    const sample =
      (
        await db.event.findFirst({
          where: { bannerUrl: { not: null } },
          select: { bannerUrl: true },
        })
      )?.bannerUrl ??
      (
        await db.project.findFirst({
          where: { imageUrl: { not: null } },
          select: { imageUrl: true },
        })
      )?.imageUrl;
    if (sample) {
      try {
        url = new URL(sample).origin;
      } catch {
        /* fall through to the null return below */
      }
    }
  }
  if (!url) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function purgeOrphanedStorage() {
  if (SKIP_STORAGE) {
    log("    --skip-storage: leaving the media bucket alone.");
    return;
  }
  for (const objectPath of ORPHANED_STORAGE_OBJECTS) {
    log(`    ✗ ${MEDIA_BUCKET}/${objectPath}`);
  }
  if (DRY_RUN) return;

  const supabase = await storageClient();
  if (!supabase) {
    log(
      "    Skipped: no Supabase credentials in the environment. Set " +
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_PRIVATE_KEY (or " +
        "SUPABASE_SERVICE_ROLE_KEY) and re-run to remove these objects.",
    );
    return;
  }
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .remove(ORPHANED_STORAGE_OBJECTS);
  if (error) {
    log(`    Storage cleanup failed: ${error.message}`);
    return;
  }
  log(`    Removed ${data?.length ?? 0} objects from ${MEDIA_BUCKET}.`);
}

// ─── Verification ───────────────────────────────────────────────────────────

async function report() {
  const [
    events,
    published,
    pendingEvents,
    projects,
    pendingProjects,
    regs,
    fb,
  ] = await Promise.all([
    db.event.count(),
    db.event.count({ where: { isPublished: true, reviewStatus: "approved" } }),
    db.event.count({ where: { reviewStatus: "pending" } }),
    db.project.count({ where: { reviewStatus: "approved" } }),
    db.project.count({ where: { reviewStatus: "pending" } }),
    db.registration.count(),
    db.feedback.count(),
  ]);
  log(
    `  events: ${events} (${published} live, ${pendingEvents} pending)\n` +
      `  projects: ${projects} approved, ${pendingProjects} pending\n` +
      `  registrations: ${regs}   feedback: ${fb}`,
  );

  const suspicious = await db.event.findMany({
    where: {
      OR: [
        { eventDate: { gt: at("2030-01-01T00:00:00Z") } },
        { eventDate: { lt: at("2024-01-01T00:00:00Z") } },
      ],
    },
    select: { title: true, eventDate: true },
  });
  if (suspicious.length > 0) {
    log("  ⚠ events with implausible dates still present:");
    for (const s of suspicious) {
      log(`     ${s.title} — ${s.eventDate.toISOString()}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  log(
    DRY_RUN
      ? "dn-orbit demo content — DRY RUN (no writes)"
      : "dn-orbit demo content — applying",
  );

  const handles = new Set<string>();
  for (const e of NEW_EVENTS) {
    handles.add(e.createdBy);
    if (e.reviewedBy) handles.add(e.reviewedBy);
  }
  for (const p of PROJECTS) {
    handles.add(p.lead);
    if (p.reviewedBy) handles.add(p.reviewedBy);
    for (const h of Object.keys(p.members)) handles.add(h);
  }
  for (const h of Object.keys(MEMBER_ATTENDANCE)) handles.add(h);
  for (const hs of Object.values(UPCOMING_MEMBER_SIGNUPS)) {
    for (const h of hs) handles.add(h);
  }
  handles.add("MuazTPM-YT");

  const members = await loadMembers([...handles]);
  log(`Resolved ${handles.size} member handles.`);

  if (!SEED_ONLY) {
    step("PURGE");
    await purge();
  }

  if (!PURGE_ONLY) {
    step("EVENTS");
    await seedEvents(members);
    step("SALVAGED EVENTS");
    await patchSalvagedEvents();
    step("REGISTRATIONS · ATTENDANCE · FEEDBACK");
    await seedRegistrations(members);
    step("PROJECTS");
    await seedProjects(members);
    step("AUDIT TRAIL");
    await seedAuditTrail(members);
  }

  if (!SEED_ONLY) {
    step("ORPHANED STORAGE OBJECTS");
    await purgeOrphanedStorage();
  }

  if (!DRY_RUN) {
    // Attendance changed, so the event component of every score is stale.
    step("LEADERBOARD");
    const { updatedUsersCount } = await recomputeLeaderboardScores();
    log(`    Recomputed ${updatedUsersCount} scores.`);

    step("RESULT");
    await report();
  }

  log(DRY_RUN ? "\nDry run complete." : "\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    process.exit(process.exitCode ?? 0);
  });
