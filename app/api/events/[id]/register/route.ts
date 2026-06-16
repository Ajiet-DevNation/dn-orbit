import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isApproved } from "@/lib/access";
import {
  parseFormSchema,
  validateSubmission,
  type EventAudience,
} from "@/lib/forms";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id: eventId } = await params;

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.reviewStatus !== "approved" || !event.isPublished)
    return NextResponse.json({ error: "Event not available" }, { status: 403 });

  const audience = event.audience as EventAudience;

  // Members-only events require an approved, signed-in member.
  const session = await auth();
  if (audience === "members") {
    if (!session)
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    if (!(await isApproved(session.user.id)))
      return NextResponse.json({ error: "Pending approval" }, { status: 403 });
  }

  // Deadline + capacity gates.
  const deadline = event.registrationDeadline ?? event.eventDate;
  if (deadline && new Date() > deadline)
    return NextResponse.json({ error: "Registration closed" }, { status: 409 });

  if (event.capacity != null) {
    const count = await db.registration.count({ where: { eventId } });
    if (count >= event.capacity)
      return NextResponse.json({ error: "Event is full" }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  // Members submit under their account identity (email locked server-side).
  const input =
    audience === "members" && session
      ? {
          name: session.user.name ?? body.name,
          email: session.user.email ?? body.email,
          usn: body.usn,
          responses: body.responses,
        }
      : body;

  const result = validateSubmission({
    audience,
    schema: parseFormSchema(event.formSchema),
    input,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Validation failed", fields: result.errors }, { status: 422 });
  }

  try {
    const registration = await db.registration.create({
      data: {
        eventId,
        userId: session?.user.id ?? null,
        name: result.value.name,
        email: result.value.email,
        usn: result.value.usn ?? null,
        responses: result.value.responses as Prisma.InputJsonValue,
      },
    });
    return NextResponse.json({ id: registration.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "This email is already registered for this event" },
        { status: 409 },
      );
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id: eventId } = await params;
  await db.registration.deleteMany({
    where: { eventId, userId: session.user.id },
  });
  return NextResponse.json({ success: true });
}
