import { NextRequest, NextResponse } from "next/server";
import { syncAllStats } from "@/lib/statsSync";
import { recomputeLeaderboardScores } from "@/lib/leaderboard";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
