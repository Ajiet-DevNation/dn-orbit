import { $Enums } from "@prisma/client";
import { z } from "zod";

// Shared request-body schemas for the Route Handlers.
//
// The server actions (app/actions/*.ts) already validated with zod; the API
// routes did not — they destructured client JSON and passed most of it straight
// into Prisma, relying on the database to reject bad values (which surfaces as
// a 500, not a 400). These schemas close that gap so validation is uniform
// across both entry styles.
//
// Every schema is `.strict()`-free on purpose: unknown keys are dropped rather
// than rejected, so an older client sending an extra field keeps working, while
// only known keys ever reach Prisma.

/** Trimmed, non-empty, length-capped text. */
const text = (max: number) => z.string().trim().min(1).max(max);

/** Optional free text — empty string and null both normalise to undefined. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : undefined));

/**
 * A URL we are willing to store and later render in an href/src. Restricted to
 * http(s) so a `javascript:` or `data:` URL can never be persisted and reflected
 * back into the DOM.
 */
const httpUrl = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .url()
    .refine(
      (v) => v.startsWith("http://") || v.startsWith("https://"),
      "must be an http(s) URL",
    );

const optionalHttpUrl = (max = 500) =>
  z
    .union([httpUrl(max), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v ? v : undefined));

// A bare `datetime-local` value — "2026-07-15T18:30" — carries no zone, so
// `new Date(...)` resolves it against whatever zone the *server* happens to run
// in (UTC on Vercel, the developer's zone under `bun dev`). The same organizer
// input would then land in the database as two different instants depending on
// where the request was handled.
const NAIVE_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

/**
 * Accepts an ISO string or epoch millis; rejects anything unparseable.
 *
 * Zone-less `datetime-local` input is pinned to UTC before parsing so an event
 * time means the same thing in every environment. lib/event-format.ts formats
 * in UTC to match, making the wall-clock time the organizer typed the wall-clock
 * time every visitor reads. Values that already carry a zone (a real ISO string
 * with `Z`/offset, or epoch millis) are untouched.
 */
const dateish = z
  .union([z.string(), z.number(), z.date()])
  .transform((v) =>
    typeof v === "string" && NAIVE_DATETIME_RE.test(v) ? `${v}Z` : v,
  )
  // Piping into the original coercion keeps unparseable input rejected exactly
  // as before; the transform above only disambiguates the zone-less form.
  .pipe(z.coerce.date());

// ── Events ───────────────────────────────────────────────────────────────────

// Derived from the Prisma enum rather than hand-listed, so adding a value to
// schema.prisma can't leave this validator silently rejecting it.
const eventAudience = z.nativeEnum($Enums.EventAudience);

const eventFields = {
  title: text(200),
  description: optionalText(5000),
  bannerUrl: optionalHttpUrl(),
  eventType: optionalText(60),
  eventDate: dateish,
  location: optionalText(300),
  isPublished: z.boolean().optional(),
  audience: eventAudience.optional(),
  capacity: z.number().int().min(1).max(100_000).nullish(),
  registrationDeadline: dateish.nullish(),
  // Shape-validated by lib/forms.ts at submission time; here we only bound it.
  formSchema: z.unknown().optional(),
};

export const createEventSchema = z.object(eventFields);

/** PATCH is the same shape with every field optional (partial update). */
export const updateEventSchema = z.object(eventFields).partial();

// ── Projects ─────────────────────────────────────────────────────────────────

const projectStatus = z.nativeEnum($Enums.ProjectStatus);

const milestoneSchema = z.object({
  label: z.string().trim().min(1).max(200),
  done: z.boolean(),
});

const projectFields = {
  title: text(200),
  description: optionalText(5000),
  imageUrl: optionalHttpUrl(),
  githubRepoUrl: httpUrl(),
  demoUrl: optionalHttpUrl(),
  techStack: z.array(z.string().trim().min(1).max(60)).max(40).optional(),
  milestones: z.array(milestoneSchema).max(100).optional(),
  status: projectStatus.optional(),
  progressPct: z.number().int().min(0).max(100).optional(),
};

export const createProjectSchema = z.object(projectFields);

export const updateProjectSchema = z
  .object({ ...projectFields, githubRepoUrl: optionalHttpUrl() })
  .partial();

// ── Feedback ─────────────────────────────────────────────────────────────────

export const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  // Bounded so a single submission can't store an unbounded blob; admins read
  // these back in the roster view.
  comments: optionalText(2000),
});

// ── Leaderboard weights ──────────────────────────────────────────────────────

/** Matches the tolerance the admin WeightForm already enforces client-side. */
const WEIGHT_SUM_TOLERANCE = 0.01;

const weight = z.number().min(0).max(1);

export const scoreWeightsSchema = z
  .object({
    githubWeight: weight,
    lcWeight: weight,
    eventWeight: weight,
    ghOpenSourceMinStars: z.number().int().min(0).max(100_000).optional(),
    ghOpenSourcePerPrPoints: z.number().min(0).max(1000).optional(),
  })
  .refine(
    (w) =>
      Math.abs(w.githubWeight + w.lcWeight + w.eventWeight - 1) <=
      WEIGHT_SUM_TOLERANCE,
    {
      // The admin UI blocks saving unless the three sliders total 100%, but the
      // route accepted anything — an all-zero config would silently flatten
      // every score to 0 with no error anywhere.
      message: "githubWeight + lcWeight + eventWeight must total 1.00",
      path: ["weights"],
    },
  );

// ── Helper ───────────────────────────────────────────────────────────────────

export type ParsedBody<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Parse a Request's JSON body against a schema.
 *
 * Returns a discriminated result instead of throwing so callers stay in the
 * `return NextResponse.json(..., { status: 400 })` style already used
 * throughout the API, and so a malformed JSON payload produces a 400 rather
 * than an unhandled 500.
 */
// Generic over the schema (not over its output) so the result is always
// `z.infer<S>` — the *output* type. Constraining to `z.ZodType<T>` forced TS to
// unify T against the schema's input type as well, which silently widened the
// result for any schema whose input and output differ (e.g. a coerced date).
export async function parseBody<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<ParsedBody<z.infer<S>>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    // First issue only — enough for the client to fix the field, and it avoids
    // echoing the whole submitted payload back in the error.
    const issue = result.error.issues[0];
    const path = issue.path.join(".");
    return {
      ok: false,
      error: path ? `${path}: ${issue.message}` : issue.message,
    };
  }
  return { ok: true, data: result.data };
}
