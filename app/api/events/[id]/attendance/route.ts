import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: eventId } = await params;
  const { userId, attended } = await req.json();

  if (!userId || attended === undefined) {
    return NextResponse.json({ error: "userId and attended are required" }, { status: 400 });
  }

  const registration = await db.registration.update({
    where: {
      userId_eventId: { userId, eventId },
    },
    data: { attended },
  });

  return NextResponse.json(registration);
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: eventId } = await params;

  const registrations = await db.registration.findMany({
    where: { eventId },
    include: {
      user: { select: { id: true, name: true, email: true, githubUsername: true } },
    },
  });

  return NextResponse.json(registrations);
}
