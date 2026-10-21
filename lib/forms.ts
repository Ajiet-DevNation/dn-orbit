// Single source of truth for registration form field definitions and the
// submission validator shared by the client renderer and the server route.

export type EventAudience =
  | "members"
  | "college"
  | "members_college"
  | "public";

// Admin "who can register" options (single source of truth for the label copy).
export const AUDIENCE_OPTIONS: { value: EventAudience; label: string }[] = [
  { value: "public", label: "ANYONE (PUBLIC)" },
  { value: "college", label: "ONLY AJIET STUDENTS (USN)" },
  { value: "members", label: "MEMBERS ONLY" },
  { value: "members_college", label: "MEMBERS + AJIET" },
];

// Short labels for the audience badge on event cards / the registration header.
export const AUDIENCE_BADGE_LABELS: Record<EventAudience, string> = {
  members: "MEMBERS ONLY",
  college: "AJIET ONLY",
  members_college: "MEMBERS + AJIET",
  public: "OPEN",
};

// Canonical event-type vocabulary.
//
// This used to be three separate lists: the public "new event" modal offered
// WORKSHOP / HACKATHON / TECH_TALK / CODEATHON / MEETUP / OTHER, the admin
// builder offered GENERAL_ASSEMBLY / HACKATHON / WORKSHOP / TECHNICAL_SEMINAR,
// and the edit page defaulted to a bare "WORKSHOP". The same event therefore
// had a different set of types available depending on which screen created it,
// and an event made in one place could show a type the other could not select.
//
// The legacy admin-only values are kept at the end so events already stored
// with them still round-trip through the edit form rather than being silently
// rewritten on the next save.
export const EVENT_TYPES = [
  "WORKSHOP",
  "HACKATHON",
  "TECH_TALK",
  "CODEATHON",
  "MEETUP",
  "GENERAL_ASSEMBLY",
  "TECHNICAL_SEMINAR",
  "OTHER",
] as const;

/** Human-facing form of a stored event type, e.g. "TECH_TALK" → "TECH TALK". */
export function eventTypeLabel(type: string): string {
  return type.replace(/_/g, " ");
}

/**
 * The options a type picker should show for a given current value. An event
 * carrying a type outside the canonical list (hand-edited, or from an older
 * vocabulary) keeps its value as a selectable option instead of the select
 * silently rendering blank and rewriting the field on save.
 */
export function eventTypeOptions(current?: string | null): string[] {
  const list: string[] = [...EVENT_TYPES];
  if (current && !list.includes(current)) list.unshift(current);
  return list;
}

export type FieldType =
  | "short_text"
  | "paragraph"
  | "email"
  | "number"
  | "date"
  | "single_choice"
  | "multi_choice"
  | "dropdown";

// Conditional display: show a field only when an earlier choice question's
// answer matches. For checkboxes (multi_choice) the answer is an array, so the
// field shows when the array *includes* `equals`.
export interface FieldCondition {
  /** id of an earlier single/multi/dropdown question that controls visibility. */
  fieldId: string;
  /** show this field only when the controlling answer equals (or includes) this. */
  equals: string;
}

export interface FormFieldDef {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  pattern?: string;
  visibleWhen?: FieldCondition;
}

// Whether a field should be shown/validated given the current answers. A field
// with no condition is always visible. Defensive against malformed conditions
// coming from stored JSON (treat as "always visible").
export function isFieldVisible(
  field: FormFieldDef,
  responses: Record<string, unknown>,
): boolean {
  const c = field.visibleWhen;
  if (!c || typeof c !== "object" || typeof c.fieldId !== "string") return true;
  const v = responses[c.fieldId];
  if (Array.isArray(v)) return v.map(String).includes(c.equals);
  return v != null && String(v) === c.equals;
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  short_text: "Short answer",
  paragraph: "Paragraph",
  email: "Email",
  number: "Number",
  date: "Date",
  single_choice: "Multiple choice (one)",
  multi_choice: "Checkboxes (many)",
  dropdown: "Dropdown",
};

export const CHOICE_TYPES: FieldType[] = [
  "single_choice",
  "multi_choice",
  "dropdown",
];

// Whether an audience ever collects USN / College ID (used to show the field /
// the "always collected" hint). For the combined members+AJIET tier the field
// is shown because AJIET students need it — see usnRequiredFor for who must fill
// it.
export function audienceCollectsUsn(audience: EventAudience): boolean {
  return (
    audience === "college" ||
    audience === "members" ||
    audience === "members_college"
  );
}

// Whether USN is *required* for this submission. On the combined "Members +
// AJIET students" tier, signed-in members register via their account (no USN);
// AJIET students (no account) must provide one. College and members-only always
// require it.
export function usnRequiredFor(
  audience: EventAudience,
  isMember: boolean,
): boolean {
  if (audience === "members_college") return !isMember;
  return audience === "college" || audience === "members";
}

// A loose, pragmatic email check. The server is authoritative; this is shared.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Upper bounds on registrant-supplied text. Public events accept anonymous
// submissions, so without caps a single registrant could stuff megabytes into
// the responses Json column (and every CSV export of it).
const MAX_NAME_LEN = 120;
const MAX_EMAIL_LEN = 254; // RFC 5321 practical limit
const MAX_USN_LEN = 32;
const MAX_TEXT_LEN = 2000;

/** Longest organizer-supplied validation regex we will run. */
export const MAX_PATTERN_LEN = 200;
/** Longest answer we will test against an organizer pattern. Patterns are for
 *  short formats (IDs, phone numbers), and the cap bounds any backtracking. */
export const MAX_PATTERN_INPUT_LEN = 128;
// Most quantifiers that let the engine choose a length (*, +, {n,}, {n,m}), and
// most two-way choices (?, |), one pattern may hold. Even without nesting,
// adjacent ones backtrack polynomially: ^\d*\d*\d*\d*x$ is n^4 per start.
const MAX_OPEN_QUANTIFIERS = 2;
const MAX_CHOICES = 4;

// Tally of the quantifiers and choices above, outside escapes and [classes].
function ambiguity(pattern: string): { open: number; choices: number } {
  let open = 0;
  let choices = 0;
  let afterQuantifier = false;
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "\\") {
      i++;
      afterQuantifier = false;
    } else if (c === "[") {
      // JS classes end at the first unescaped ] (even `[]`).
      for (i++; i < pattern.length && pattern[i] !== "]"; i++) {
        if (pattern[i] === "\\") i++;
      }
      afterQuantifier = false;
    } else if (c === "(") {
      // (?: (?= (?<name> … — that ? opens a group, it is not a quantifier.
      if (pattern[i + 1] === "?") i++;
      afterQuantifier = false;
    } else if (c === "*" || c === "+") {
      open++;
      afterQuantifier = true;
    } else if (c === "?") {
      // After a quantifier it only makes that one lazy.
      if (!afterQuantifier) choices++;
      afterQuantifier = !afterQuantifier;
    } else if (c === "|") {
      choices++;
      afterQuantifier = false;
    } else if (c === "{") {
      const m = /^\{(\d+)(,(\d*))?\}/.exec(pattern.slice(i));
      if (m) {
        if (m[2] && (m[3] === "" || Number(m[3]) > Number(m[1]))) open++;
        i += m[0].length - 1;
        afterQuantifier = true;
      } else {
        afterQuantifier = false;
      }
    } else {
      afterQuantifier = false;
    }
  }
  return { open, choices };
}

// Patterns run against anonymous input, so a catastrophic one — nested
// quantifiers like (a+)+ or (a|aa)* — would let any registrant pin the
// server's event loop. Reject: over-long patterns, a repeated group that holds
// a quantifier or an alternation, backreferences, and more ambiguity than the
// budgets above allow. Shortcut: a heuristic, not a full
// ReDoS analyser; if organizers ever need richer patterns, move to RE2.
const NESTED_QUANTIFIER =
  /\((?:[^()\\]|\\.)*[*+?}](?:[^()\\]|\\.)*\)\s*(?:[*+]|\{\d)/;
const REPEATED_ALTERNATION =
  /\((?:[^()\\]|\\.)*\|(?:[^()\\]|\\.)*\)\s*(?:[*+]|\{\d)/;
export function isSafePattern(pattern: string): boolean {
  if (pattern.length > MAX_PATTERN_LEN) return false;
  if (NESTED_QUANTIFIER.test(pattern)) return false;
  if (REPEATED_ALTERNATION.test(pattern)) return false;
  if (/\\[1-9]/.test(pattern)) return false;
  const { open, choices } = ambiguity(pattern);
  if (open > MAX_OPEN_QUANTIFIERS || choices > MAX_CHOICES) return false;
  try {
    new RegExp(pattern);
  } catch {
    return false;
  }
  return true;
}

// USN format is deliberately NOT validated unless an admin sets `usnPattern`
// on the event: college ID formats vary by cohort, and a hard-coded default
// would reject legitimate registrations for the sake of a hint.

export interface SubmissionInput {
  name?: string;
  email?: string;
  usn?: string;
  responses?: Record<string, unknown>;
}

export interface ValidateArgs {
  audience: EventAudience;
  schema: FormFieldDef[];
  usnPattern?: string;
  /** Signed-in approved member — exempts them from USN on the combined tier. */
  isMember?: boolean;
  input: SubmissionInput;
}

export interface CleanSubmission {
  name: string;
  email: string;
  usn?: string;
  responses: Record<string, unknown>;
}

export type ValidateResult =
  | { ok: true; errors: Record<string, never>; value: CleanSubmission }
  | { ok: false; errors: Record<string, string>; value?: undefined };

function isBlank(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export function validateSubmission(args: ValidateArgs): ValidateResult {
  const { audience, schema, input } = args;
  const errors: Record<string, string> = {};
  const responses: Record<string, unknown> = {};

  const name = (input.name ?? "").trim();
  const email = (input.email ?? "").trim();
  if (!name) errors.name = "Name is required";
  else if (name.length > MAX_NAME_LEN) errors.name = "Name is too long";
  if (!email) errors.email = "Email is required";
  else if (email.length > MAX_EMAIL_LEN || !EMAIL_RE.test(email))
    errors.email = "Enter a valid email";

  let usn: string | undefined;
  if (usnRequiredFor(audience, !!args.isMember)) {
    usn = (input.usn ?? "").trim();
    if (!usn) {
      errors.usn = "USN / College ID is required";
    } else if (usn.length > MAX_USN_LEN) {
      errors.usn = "USN is too long";
    } else if (args.usnPattern && isSafePattern(args.usnPattern)) {
      try {
        if (!new RegExp(args.usnPattern).test(usn)) {
          errors.usn = "USN format is invalid";
        }
      } catch {
        // An invalid admin-supplied pattern should not block submission.
      }
    }
  }

  const src = input.responses ?? {};
  for (const f of schema) {
    // A field hidden by an unmet condition isn't required and its (stale)
    // answer is dropped — keeps branching forms from blocking on questions the
    // user never saw.
    if (!isFieldVisible(f, src)) continue;
    const raw = src[f.id];
    if (isBlank(raw)) {
      if (f.required) errors[f.id] = `${f.label} is required`;
      continue;
    }
    switch (f.type) {
      case "email": {
        const s = String(raw).trim();
        // Length first: EMAIL_RE is quadratic on long input like "a@....@".
        if (s.length > MAX_EMAIL_LEN || !EMAIL_RE.test(s))
          errors[f.id] = "Enter a valid email";
        else responses[f.id] = s;
        break;
      }
      case "number": {
        const n = Number(raw);
        if (!Number.isFinite(n)) errors[f.id] = `${f.label} must be a number`;
        else responses[f.id] = n;
        break;
      }
      case "date": {
        const s = String(raw);
        if (Number.isNaN(Date.parse(s))) errors[f.id] = "Enter a valid date";
        else responses[f.id] = s;
        break;
      }
      case "single_choice":
      case "dropdown": {
        const s = String(raw);
        if (!(f.options ?? []).includes(s))
          errors[f.id] = "Choose a valid option";
        else responses[f.id] = s;
        break;
      }
      case "multi_choice": {
        // Deduped, so a repeated option can't bloat the stored row.
        const arr = [
          ...new Set(Array.isArray(raw) ? raw.map(String) : [String(raw)]),
        ];
        const opts = f.options ?? [];
        if (arr.length > opts.length || !arr.every((v) => opts.includes(v)))
          errors[f.id] = "Invalid selection";
        else responses[f.id] = arr;
        break;
      }
      default: {
        const s = String(raw);
        if (s.length > MAX_TEXT_LEN) {
          errors[f.id] = `${f.label} is too long`;
          break;
        }
        // An unsafe pattern (see isSafePattern) is ignored, like an invalid one.
        if (f.pattern && isSafePattern(f.pattern)) {
          if (s.length > MAX_PATTERN_INPUT_LEN) {
            errors[f.id] = `${f.label} is too long`;
            break;
          }
          try {
            if (!new RegExp(f.pattern).test(s))
              errors[f.id] = `${f.label} format is invalid`;
            else responses[f.id] = s;
          } catch {
            responses[f.id] = s;
          }
        } else {
          responses[f.id] = s;
        }
      }
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    errors: {} as Record<string, never>,
    value: { name, email, usn, responses },
  };
}

// Narrowing helper: parse arbitrary JSON into a FormFieldDef[] (skips bad rows).
export function parseFormSchema(value: unknown): FormFieldDef[] {
  if (!Array.isArray(value)) return [];
  const out: FormFieldDef[] = [];
  for (const r of value) {
    if (
      r &&
      typeof r === "object" &&
      typeof (r as FormFieldDef).id === "string" &&
      typeof (r as FormFieldDef).label === "string" &&
      typeof (r as FormFieldDef).type === "string"
    ) {
      out.push(r as FormFieldDef);
    }
  }
  return out;
}
