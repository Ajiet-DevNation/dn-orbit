import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const now = new Date();

  const events = await db.event.findMany({
    where: {
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

  const isAdmin = session.user.role === "admin";

  const { title, description, bannerUrl, eventType, eventDate, location, isPublished } = await req.json();

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
      // Non-admins may submit events, but they stay unpublished (pending admin
      // approval) regardless of the requested value. Only admins can publish.
      isPublished: isAdmin ? (isPublished ?? false) : false,
      createdBy: session.user.id,
    },
  });

  return NextResponse.json(event, { status: 201 });
}
