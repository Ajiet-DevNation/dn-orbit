import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eventUpdateData } from "@/lib/event-payload";
import { canAccessAdmin } from "@/lib/roles";
import { parseBody, updateEventSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// Fields safe to hand to anyone. Deliberately an explicit allowlist rather than
// an `omit`: a column added to the Event model later must be opted IN here, so
// a future schema change can't silently start leaking.
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

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  const isAdmin = !!session && canAccessAdmin(session.user.role);

  // Admins get the full record, roster and feedback included — that is what the
  // admin event page needs. Everyone else gets the public projection.
  //
  // This route previously ran neither of these checks: it returned every
  // registration (userId, attended, registeredAt) and every feedback row
  // (rating, comments) to any unauthenticated caller who knew the event id, and
  // served unpublished/unapproved events too. The sibling
  // GET /api/events/[id]/feedback has always been admin-gated; this one was not.
  if (isAdmin) {
    const event = await db.event.findUnique({
      where: { id },
      include: {
        registrations: {
          select: { userId: true, attended: true, registeredAt: true },
        },
        feedback: { select: { rating: true, comments: true } },
      },
    });
    if (!event) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(event);
  }

  // Draft and unapproved events 404 rather than 403 — a 403 would confirm that
  // an event with this id exists, which is itself a disclosure.
  const event = await db.event.findFirst({
    where: { id, isPublished: true, reviewStatus: "approved" },
    select: PUBLIC_EVENT_SELECT,
  });

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || !canAccessAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = await parseBody(req, updateEventSchema);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const updated = await db.event.update({
    where: { id },
    data: eventUpdateData(parsed.data),
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || !canAccessAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await db.event.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
