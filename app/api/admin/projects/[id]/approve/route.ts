import { type NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/roles";

type Params = { params: Promise<{ id: string }> };

// Admin moderation: approve or reject a submitted project. Server-side RBAC —
// never trusts the client; the only writable target is review_status + reviewer.
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

    const updated = await db.project.update({
      where: { id },
      data: {
        reviewStatus: action === "approve" ? "approved" : "rejected",
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    });

    void logAudit({
      action: `project.${action}`,
      actorId: session.user.id,
      actorName: session.user.name,
      summary: `${action === "approve" ? "Approved" : "Rejected"} project "${updated.title}"`,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Review Project Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
