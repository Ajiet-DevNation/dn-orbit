import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id: eventId } = await params;

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (!event.isPublished) return NextResponse.json({ error: "Event not available" }, { status: 403 });

  const registration = await db.registration.upsert({
    where: {
      userId_eventId: {
        userId: session.user.id,
        eventId,
      },
    },
    update: {},
    create: {
      userId: session.user.id,
      eventId,
    },
  });

  return NextResponse.json(registration, { status: 201 });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id: eventId } = await params;

  await db.registration.deleteMany({
    where: {
      userId: session.user.id,
      eventId,
    },
  });

  return NextResponse.json({ success: true });
}
