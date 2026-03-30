import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id: eventId } = await params;
  const { rating, comments } = await req.json();

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating must be between 1 and 5" }, { status: 400 });
  }

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.eventDate > new Date()) {
    return NextResponse.json({ error: "Cannot submit feedback before event ends" }, { status: 403 });
  }

  const feedback = await db.feedback.upsert({
    where: {
      userId_eventId: {
        userId: session.user.id,
        eventId,
      },
    },
    update: { rating, comments },
    create: {
      userId: session.user.id,
      eventId,
      rating,
      comments,
    },
  });

  return NextResponse.json(feedback, { status: 201 });
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: eventId } = await params;

  const feedback = await db.feedback.findMany({
    where: { eventId },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(feedback);
}
