// Team sign-up rules for events whose `teamConfig` is set (CTF 2.0 and later).
//
// Registrants on AJIET-only events have no account (sign-in is allowlist-gated),
// so a team can't be managed after the fact. Instead every registrant creates a
// team or joins one with its invite code in the same submission, and the
// register route enforces the limits under the event row lock.
//
// DB-free and dependency-light so the registration page and the register route
// validate with the exact same rules.

import { z } from "zod";

export interface TeamConfig {
  /** Fewest members a team needs to compete. Smaller teams are flagged, not blocked. */
  minSize: number;
  /** Most members a team can hold; joins past this are refused. */
  maxSize: number;
  /** Most teams the event takes; null = no limit. */
  maxTeams: number | null;
  /** Form field every member must answer the same way (e.g. branch); null = none. */
  matchFieldId: string | null;
}

export const teamConfigSchema = z
  .object({
    minSize: z.number().int().min(1).max(50),
    maxSize: z.number().int().min(1).max(50),
    maxTeams: z.number().int().min(1).max(1000).nullable().default(null),
    matchFieldId: z.string().min(1).max(64).nullable().default(null),
  })
  .refine((c) => c.minSize <= c.maxSize, {
    message: "minSize can't be above maxSize",
    path: ["minSize"],
  });

/** The stored config, or null for an individual event. A malformed value is
 *  logged and treated as individual so one bad row can't break the home page;
 *  the only writer (scripts/addCtf2Event.ts) validates with the same schema. */
export function parseTeamConfig(raw: unknown): TeamConfig | null {
  if (raw == null) return null;
  const parsed = teamConfigSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(
      "[teams] ignoring malformed teamConfig:",
      parsed.error.issues,
    );
    return null;
  }
  return parsed.data;
}

// ── Team names ───────────────────────────────────────────────────────────────

export const TEAM_NAME_MIN = 2;
export const TEAM_NAME_MAX = 32;
// Starts with a letter or digit; then letters (with their combining marks, which
// Kannada and Devanagari need), digits, spaces and light punctuation. Keeps
// names printable on the projector and safe in CSV/email.
const TEAM_NAME_RE = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} .,'!?&+#@_-]*$/u;

/** Trimmed, with runs of whitespace collapsed to one space. */
export function cleanTeamName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** What makes two names "the same" for uniqueness: case-insensitive. */
export function teamNameKey(name: string): string {
  return cleanTeamName(name).toLowerCase();
}

export function teamNameError(raw: string): string | null {
  const name = cleanTeamName(raw);
  if (!name) return "Team name is required";
  if (name.length < TEAM_NAME_MIN)
    return `Team name needs at least ${TEAM_NAME_MIN} characters`;
  if (name.length > TEAM_NAME_MAX)
    return `Team name can be at most ${TEAM_NAME_MAX} characters`;
  if (!TEAM_NAME_RE.test(name))
    return "Use letters, numbers, spaces and . , ' ! ? & + # @ _ - only";
  return null;
}

// ── Invite codes ─────────────────────────────────────────────────────────────

// No 0/O, 1/I/L: codes are read off phones and typed by hand.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const TEAM_CODE_LEN = 8;

/** A random invite code, e.g. "K7QX29MD". 31^8 ≈ 8.5e11 codes, so guessing one
 *  through the rate-limited register route is not a practical way in. */
export function generateTeamCode(): string {
  const n = CODE_ALPHABET.length;
  // Rejection sampling keeps every character uniform (256 % 31 != 0).
  const limit = 256 - (256 % n);
  let out = "";
  const buf = new Uint8Array(16);
  while (out.length < TEAM_CODE_LEN) {
    crypto.getRandomValues(buf);
    for (const b of buf) {
      if (b < limit && out.length < TEAM_CODE_LEN) out += CODE_ALPHABET[b % n];
    }
  }
  return out;
}

/** What the user typed, reduced to the stored form: "k7qx-29md " → "K7QX29MD". */
export function normalizeTeamCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isWellFormedTeamCode(code: string): boolean {
  return (
    code.length === TEAM_CODE_LEN &&
    [...code].every((c) => CODE_ALPHABET.includes(c))
  );
}

/** Display form: "K7QX29MD" → "K7QX-29MD". */
export function formatTeamCode(code: string): string {
  const mid = Math.ceil(code.length / 2);
  return `${code.slice(0, mid)}-${code.slice(mid)}`;
}

// ── The registrant's choice ──────────────────────────────────────────────────

export type TeamChoice =
  | { action: "create"; name: string }
  | { action: "join"; code: string };

/** Error keys used on the registration form (beside name/email/usn/field ids). */
export const TEAM_ERROR_KEYS = {
  choice: "team",
  name: "teamName",
  code: "teamCode",
} as const;

export type TeamChoiceResult =
  | { ok: true; value: TeamChoice }
  | { ok: false; errors: Record<string, string> };

/** Shape-checks the choice and cleans it (name tidied, code normalized). The
 *  limits that need the database (slots, size, branch) are the route's job. */
export function validateTeamChoice(
  choice: TeamChoice | null | undefined,
): TeamChoiceResult {
  if (!choice)
    return {
      ok: false,
      errors: { [TEAM_ERROR_KEYS.choice]: "Create a team or join one" },
    };
  if (choice.action === "create") {
    const err = teamNameError(choice.name);
    if (err) return { ok: false, errors: { [TEAM_ERROR_KEYS.name]: err } };
    return {
      ok: true,
      value: { action: "create", name: cleanTeamName(choice.name) },
    };
  }
  const code = normalizeTeamCode(choice.code);
  if (!code)
    return {
      ok: false,
      errors: { [TEAM_ERROR_KEYS.code]: "Enter your team's invite code" },
    };
  if (!isWellFormedTeamCode(code))
    return {
      ok: false,
      errors: {
        [TEAM_ERROR_KEYS.code]: `Invite codes are ${TEAM_CODE_LEN} letters and numbers, like ABCD-2345`,
      },
    };
  return { ok: true, value: { action: "join", code } };
}

/** The registrant's answer on the match field, or null when there is no rule. */
export function matchValueFor(
  config: TeamConfig,
  responses: Record<string, unknown>,
): string | null {
  if (!config.matchFieldId) return null;
  const v = responses[config.matchFieldId];
  return v == null || v === "" ? null : String(v);
}

// ── Team and event state ─────────────────────────────────────────────────────

export type TeamStatus = "incomplete" | "complete" | "full";

export function teamStatus(size: number, config: TeamConfig): TeamStatus {
  if (size >= config.maxSize) return "full";
  if (size < config.minSize) return "incomplete";
  return "complete";
}

/** True when nobody else can register: no new team may be made and every
 *  existing team is at its size cap. */
export function teamEventFull(
  config: TeamConfig,
  teamSizes: number[],
): boolean {
  const canCreate =
    config.maxTeams == null || teamSizes.length < config.maxTeams;
  return !canCreate && teamSizes.every((s) => s >= config.maxSize);
}

/** "4–6 members" or "4 members". */
export function teamSizeLabel(config: TeamConfig): string {
  return config.minSize === config.maxSize
    ? `${config.minSize} members`
    : `${config.minSize}–${config.maxSize} members`;
}
