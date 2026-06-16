import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";

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
    orderBy: { eventDate: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const isAdmin = canAccessAdmin(session.user.role);

  const {
    title, description, bannerUrl, eventType, eventDate, location, isPublished,
    audience, capacity, registrationDeadline, formSchema,
  } = await req.json();

  if (!title || !eventDate) {
    return NextResponse.json({ error: "title and eventDate are required" }, { status: 400 });
  }

  const event = await db.event.create({
    data: {
      title,
      description,
      bannerUrl,
      eventType,
      eventDate: new Date(eventDate),
      location,
      audience: audience ?? "public",
      capacity: capacity ?? null,
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
      formSchema: formSchema ?? undefined,
      // Every new event enters the moderation queue regardless of who submits it.
      reviewStatus: "pending",
      // isPublished is the author's draft/live choice (separate from moderation);
      // non-admins still can't self-publish. Public visibility needs approved +
      // published, so this never bypasses review.
      isPublished: isAdmin ? (isPublished ?? false) : false,
      createdBy: session.user.id,
    },
  });

  return NextResponse.json(event, { status: 201 });
}
