import { type NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { db, isRecordNotFound } from "@/lib/db";
import { invalidatePublic, PUBLIC_TAG } from "@/lib/public-tags";
import { canAccessAdmin } from "@/lib/roles";
import { parseBody, reviewActionSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// Admin moderation: approve or reject a submitted project. Server-side RBAC —
// never trusts the client; the only writable target is review_status + reviewer.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    if (!canAccessAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    // A malformed body is the client's fault — 400, not the 500 an unguarded
    // req.json() used to produce.
    const parsed = await parseBody(req, reviewActionSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { action } = parsed.data;

    const updated = await db.project.update({
      where: { id },
      data: {
        reviewStatus: action === "approve" ? "approved" : "rejected",
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    });
    invalidatePublic(PUBLIC_TAG.projects);

    void logAudit({
      action: `project.${action}`,
      actorId: session.user.id,
      actorName: session.user.name,
      summary: `${action === "approve" ? "Approved" : "Rejected"} project "${updated.title}"`,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (isRecordNotFound(error)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("Review Project Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
