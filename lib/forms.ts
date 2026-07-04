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

// Default USN pattern (RIT-style) used as a hint; admins may override per event.
export const DEFAULT_USN_PATTERN = "^1MS\\d{2}[A-Z]{2}\\d{3}$";

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
    } else if (args.usnPattern) {
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
        if (!EMAIL_RE.test(s)) errors[f.id] = "Enter a valid email";
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
        const arr = Array.isArray(raw) ? raw.map(String) : [String(raw)];
        const opts = f.options ?? [];
        if (!arr.every((v) => opts.includes(v)))
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
        if (f.pattern) {
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
