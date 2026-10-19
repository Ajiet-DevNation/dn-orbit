import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/roles";

type Params = { params: Promise<{ id: string }> };

// Admin "refresh this member's stats now". Flags the member dirty in the stats
// drip queue (lib/sync.ts) so the next drain refreshes them first, and clears
// any failure backoff. This used to back-date github_stats/lc_stats.fetchedAt,
// which the queue never reads — so the button silently did nothing.
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session || !canAccessAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: userId } = await params;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const queued = {
      ghDirty: true,
      lcDirty: true,
      failCount: 0,
      nextAttemptAt: null,
      lockedUntil: null,
    };
    await db.statsSyncState.upsert({
      where: { userId },
      create: { userId, ...queued },
      update: queued,
    });

    return NextResponse.json({
      success: true,
      message: "Member queued for a stats refresh",
    });
  } catch (error) {
    console.error("Manual Stat Refresh Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
