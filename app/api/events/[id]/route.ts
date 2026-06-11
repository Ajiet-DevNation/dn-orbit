import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const event = await db.event.findUnique({
    where: { id },
    include: {
      registrations: { select: { userId: true, attended: true, registeredAt: true } },
      feedback: { select: { rating: true, comments: true } },
    },
  });

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { title, description, bannerUrl, eventType, eventDate, location, isPublished } = body;

  const updated = await db.event.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(bannerUrl !== undefined && { bannerUrl }),
      ...(eventType !== undefined && { eventType }),
      ...(eventDate !== undefined && { eventDate: new Date(eventDate) }),
      ...(location !== undefined && { location }),
      ...(isPublished !== undefined && { isPublished }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await db.event.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
