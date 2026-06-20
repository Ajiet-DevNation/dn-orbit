import { NextRequest, NextResponse } from "next/server";
import { syncAllStats } from "@/lib/statsSync";
import { recomputeLeaderboardScores } from "@/lib/leaderboard";

// Syncing every member's GitHub + LeetCode stats hits external APIs serially and
// can run past the short default serverless budget, 504-ing mid-sync and skipping
// the recompute. Request the longest duration that's safe on every Vercel plan:
// 60s is the Hobby ceiling (asking for more fails the build there) and is allowed
// on Pro/Ent too. The GitHub Action retries, and each tick re-syncs everyone, so
// a very large cohort still converges across runs. Always dynamic (never cached)
// and on Node so each cron tick does real work.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Reject when the secret is unset so an unset env var can't degrade the gate
  // to the bypassable `Bearer undefined` comparison.
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await syncAllStats();
    const leaderboard = await recomputeLeaderboardScores();

    return NextResponse.json({
      success: true,
      totalUsers: stats.totalUsers,
      results: stats.results,
      updatedUsersCount: leaderboard.updatedUsersCount,
    });
  } catch (error) {
    console.error("Stats Sync Cron Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
