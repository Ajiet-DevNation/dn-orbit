import { NextResponse } from "next/server";
import { canManageEventRoster } from "@/lib/access";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recomputeLeaderboardAfterResponse } from "@/lib/leaderboard";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: eventId } = await params;
    const session = await auth();

    // Admins only. Attendance is the event-score numerator on the leaderboard,
    // and any member can create an event — an organizer marking their own
    // events (themselves, friends) attended would be a self-serve score boost.
    // Organizers still see their roster and attendance on /my-events.
    const access = await canManageEventRoster(eventId, session?.user);
    if (!access.ok) {
      return new NextResponse(
        access.status === 404 ? "EVENT_NOT_FOUND" : "UNAUTHORIZED_ACCESS",
        { status: access.status },
      );
    }
    if (!access.isAdmin) {
      return new NextResponse("UNAUTHORIZED_ACCESS", { status: 403 });
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
    // Attendance is the event-score numerator.
    recomputeLeaderboardAfterResponse();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[EVENT_ATTENDANCE_POST]", error);
    return new NextResponse("INTERNAL_SERVER_ERROR", { status: 500 });
  }
}
