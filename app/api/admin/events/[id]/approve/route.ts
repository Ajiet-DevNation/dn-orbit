import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

// Admin moderation: approve or reject a submitted event. Mirrors the project
// review route. Approval alone doesn't make the event public — it must also be
// published (isPublished) by the author/admin. Server-side RBAC enforced.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session || !canAccessAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { action } = await req.json();

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject"' },
        { status: 400 },
      );
    }

    const updated = await db.event.update({
      where: { id },
      data: {
        reviewStatus: action === "approve" ? "approved" : "rejected",
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    });

    void logAudit({
      action: `event.${action}`,
      actorId: session.user.id,
      actorName: session.user.name,
      summary: `${action === "approve" ? "Approved" : "Rejected"} event "${updated.title}"`,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Review Event Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
