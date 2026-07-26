import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/roles";
import { createEventSchema, parseBody } from "@/lib/validation";

// Same explicit allowlist as the detail route — moderation columns
// (reviewStatus, reviewedById, createdBy) are not public information.
const PUBLIC_EVENT_SELECT = {
  id: true,
  title: true,
  description: true,
  bannerUrl: true,
  eventType: true,
  eventDate: true,
  location: true,
  audience: true,
  capacity: true,
  registrationDeadline: true,
  formSchema: true,
  createdAt: true,
} as const;

// Bound on an unauthenticated, unpaginated endpoint. The club will not have
// 500 published events; if it ever does, this needs real pagination rather than
// a silently truncated list.
const MAX_EVENTS = 500;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const now = new Date();

  const events = await db.event.findMany({
    where: {
      // Public visibility requires BOTH admin approval and the author publishing.
      reviewStatus: "approved",
      isPublished: true,
      ...(type === "upcoming" ? { eventDate: { gte: now } } : {}),
      ...(type === "past" ? { eventDate: { lt: now } } : {}),
    },
    select: PUBLIC_EVENT_SELECT,
    orderBy: { eventDate: "asc" },
    take: MAX_EVENTS,
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const isAdmin = canAccessAdmin(session.user.role);

  const parsed = await parseBody(req, createEventSchema);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const {
    title,
    description,
    bannerUrl,
    eventType,
    eventDate,
    location,
    isPublished,
    audience,
    capacity,
    registrationDeadline,
    formSchema,
  } = parsed.data;

  const event = await db.event.create({
    data: {
      title,
      description,
      bannerUrl,
      eventType,
      eventDate,
      location,
      audience: audience ?? "public",
      capacity: capacity ?? null,
      registrationDeadline: registrationDeadline ?? null,
      formSchema: (formSchema ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
      // Every new event enters the moderation queue regardless of who submits it.
      reviewStatus: "pending",
      // isPublished is the author's draft/live choice (separate from moderation);
      // non-admins still can't self-publish. Public visibility needs approved +
      // published, so this never bypasses review.
      isPublished: isAdmin ? (isPublished ?? false) : false,
      createdBy: session.user.id,
    },
  });

  void logAudit({
    action: "event.create",
    actorId: session.user.id,
    actorName: session.user.name,
    summary: `${isAdmin ? "Created" : "Submitted"} event "${event.title}"`,
  });

  // Was this the creator's very first event? Used by the client to show a
  // one-time pointer to the "Your Events" page (=== 1 since the row above just
  // committed). Cheap indexed count; only the creator's own rows are counted.
  const createdCount = await db.event.count({
    where: { createdBy: session.user.id },
  });

  return NextResponse.json(
    { ...event, isFirstEvent: createdCount === 1 },
    { status: 201 },
  );
}
