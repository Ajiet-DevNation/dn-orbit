import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/roles";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!canAccessAdmin(session?.user?.role)) {
      return new NextResponse("UNAUTHORIZED_ACCESS", { status: 403 });
    }

    const { id: eventId } = await params;
    const body = await req.json();
    const { registrationId, attended } = body;

    if (!registrationId || typeof attended !== "boolean") {
      return new NextResponse("INVALID_PAYLOAD", { status: 400 });
    }

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
