import { type NextRequest, NextResponse } from "next/server";
import { isApproved } from "@/lib/access";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitKey, tooManyRequests } from "@/lib/rate-limit";
import { canAccessAdmin } from "@/lib/roles";
import { feedbackSchema, parseBody } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!(await isApproved(session.user.id)))
    return NextResponse.json({ error: "Pending approval" }, { status: 403 });

  const limit = rateLimit(
    rateLimitKey(req, "event-feedback", session.user.id),
    20,
    60_000,
  );
  if (!limit.ok) return tooManyRequests(limit);

  const { id: eventId } = await params;
  // A malformed body used to reach `await req.json()` unguarded and surface as
  // a 500; it's a client error, so answer 400.
  const parsed = await parseBody(req, feedbackSchema);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { rating, comments } = parsed.data;

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event)
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.eventDate > new Date()) {
    return NextResponse.json(
      { error: "Cannot submit feedback before event ends" },
      { status: 403 },
    );
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
  if (!session)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canAccessAdmin(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: eventId } = await params;

  const feedback = await db.feedback.findMany({
    where: { eventId },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(feedback);
}
