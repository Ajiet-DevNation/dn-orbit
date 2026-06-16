import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Enforce Admin Security Clearance
    const session = await auth();
    if (!canAccessAdmin(session?.user?.role)) {
      return new NextResponse("UNAUTHORIZED_ACCESS", { status: 403 });
    }

    // 2. Await the dynamic route parameters (Next.js 15+ requirement)
    const resolvedParams = await params;
    const eventId = resolvedParams.id;

    // 3. Extract the payload from the frontend
    const body = await req.json();
    const { userId, attended } = body;

    if (!userId || typeof attended !== "boolean") {
      return new NextResponse("INVALID_PAYLOAD", { status: 400 });
    }

    // 4. Update the operative's attendance status in the database
    // We use updateMany here because we are querying by the composite of eventId + userId
    const updatedRegistration = await db.registration.updateMany({
      where: {
        eventId: eventId,
        userId: userId,
      },
      data: {
        attended: attended,
      },
    });

    if (updatedRegistration.count === 0) {
      return new NextResponse("REGISTRATION_NOT_FOUND", { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "ATTENDANCE_STATUS_UPDATED",
    });
  } catch (error) {
    console.error("[EVENT_ATTENDANCE_POST]", error);
    return new NextResponse("INTERNAL_SERVER_ERROR", { status: 500 });
  }
}
