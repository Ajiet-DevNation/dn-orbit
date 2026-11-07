import { type NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { db, isRecordNotFound } from "@/lib/db";
import { recomputeLeaderboardAfterResponse } from "@/lib/leaderboard";
import { invalidatePublic, PUBLIC_TAG } from "@/lib/public-tags";
import { canAccessAdmin } from "@/lib/roles";
import { parseBody, reviewActionSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// Admin moderation: approve or reject a submitted event. Mirrors the project
// review route. Approval alone doesn't make the event public — it must also be
// published (isPublished) by the author/admin. Server-side RBAC enforced.
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

    const updated = await db.event.update({
      where: { id },
      data: {
        reviewStatus: action === "approve" ? "approved" : "rejected",
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    });

    // Approval decides whether a published event counts toward event scores.
    recomputeLeaderboardAfterResponse();
    invalidatePublic(PUBLIC_TAG.events);

    void logAudit({
      action: `event.${action}`,
      actorId: session.user.id,
      actorName: session.user.name,
      summary: `${action === "approve" ? "Approved" : "Rejected"} event "${updated.title}"`,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (isRecordNotFound(error)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("Review Event Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
