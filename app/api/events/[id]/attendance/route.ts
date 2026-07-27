import { NextResponse } from "next/server";
import { canManageEventRoster } from "@/lib/access";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: eventId } = await params;
    const session = await auth();

    // Admins may mark attendance on any event; an organizer only on the events
    // they created. Previously admin-only, which left organizers unable to run
    // their own door list.
    const access = await canManageEventRoster(eventId, session?.user);
    if (!access.ok) {
      return new NextResponse(
        access.status === 404 ? "EVENT_NOT_FOUND" : "UNAUTHORIZED_ACCESS",
        { status: access.status },
      );
    }

    const body = await req.json();
    const { registrationId, attended } = body;

    if (typeof registrationId !== "string" || typeof attended !== "boolean") {
      return new NextResponse("INVALID_PAYLOAD", { status: 400 });
    }

    // Scoped by eventId as well as registrationId so a caller authorized for
    // one event cannot flip attendance on a registration belonging to another.
    const updated = await db.registration.updateMany({
      where: { id: registrationId, eventId },
      data: { attended },
    });

    if (updated.count === 0) {
      return new NextResponse("REGISTRATION_NOT_FOUND", { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[EVENT_ATTENDANCE_POST]", error);
    return new NextResponse("INTERNAL_SERVER_ERROR", { status: 500 });
  }
}
