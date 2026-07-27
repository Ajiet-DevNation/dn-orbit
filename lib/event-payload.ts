// Maps validated event input onto Prisma write payloads.
//
// The create and update routes each carried their own copy of the eleven-field
// destructure plus the mapping onto Prisma `data` — fallow flagged it as a
// 41-line clone. The duplication mattered beyond tidiness: adding a column to
// the Event model meant remembering two files, and forgetting the second one
// produced a field that could be created but never edited (or vice versa).
//
// Both shapes are derived from the zod schemas, so the field list here cannot
// drift from what the routes actually accept.
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import type { createEventSchema, updateEventSchema } from "@/lib/validation";

type CreateInput = z.infer<typeof createEventSchema>;
type UpdateInput = z.infer<typeof updateEventSchema>;

// `formSchema` is validated for shape at submission time by lib/forms.ts; here
// it is only widened to the type Prisma accepts for a Json column.
function asJson(v: unknown): Prisma.InputJsonValue | undefined {
  return (v ?? undefined) as Prisma.InputJsonValue | undefined;
}

/**
 * Full create payload for a new event.
 *
 * Two invariants are enforced here rather than at the call site, so they hold
 * for every future caller:
 *   - `reviewStatus` is always `pending` — every event enters moderation, no
 *     matter who submits it.
 *   - a non-admin can never self-publish; public visibility still requires an
 *     admin to approve *and* the author to publish.
 */
export function eventCreateData(
  input: CreateInput,
  actor: { userId: string; isAdmin: boolean },
): Prisma.EventUncheckedCreateInput {
  return {
    title: input.title,
    description: input.description,
    bannerUrl: input.bannerUrl,
    eventType: input.eventType,
    eventDate: input.eventDate,
    location: input.location,
    audience: input.audience ?? "public",
    capacity: input.capacity ?? null,
    registrationDeadline: input.registrationDeadline ?? null,
    formSchema: asJson(input.formSchema),
    reviewStatus: "pending",
    isPublished: actor.isAdmin ? (input.isPublished ?? false) : false,
    createdBy: actor.userId,
  };
}

/**
 * Sparse update payload: only the keys the caller actually sent.
 *
 * A field left out of the request body is absent from the result, so a PATCH
 * never clobbers a column the client did not mention. A field sent explicitly
 * as `null` still clears it.
 */
export function eventUpdateData(input: UpdateInput): Prisma.EventUpdateInput {
  return {
    ...(input.title !== undefined && { title: input.title }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.bannerUrl !== undefined && { bannerUrl: input.bannerUrl }),
    ...(input.eventType !== undefined && { eventType: input.eventType }),
    ...(input.eventDate !== undefined && { eventDate: input.eventDate }),
    ...(input.location !== undefined && { location: input.location }),
    ...(input.isPublished !== undefined && { isPublished: input.isPublished }),
    ...(input.audience !== undefined && { audience: input.audience }),
    ...(input.capacity !== undefined && { capacity: input.capacity }),
    ...(input.registrationDeadline !== undefined && {
      registrationDeadline: input.registrationDeadline,
    }),
    ...(input.formSchema !== undefined && {
      formSchema: input.formSchema as Prisma.InputJsonValue,
    }),
  };
}
