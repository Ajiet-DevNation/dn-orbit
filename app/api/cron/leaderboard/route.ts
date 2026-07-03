import { type NextRequest, NextResponse } from "next/server";
import { recomputeLeaderboardScores } from "@/lib/leaderboard";

// A pure recompute (no external API calls) is quick, but keep it on Node, always
// dynamic (never cached), and give it headroom so a large cohort can't 504.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify Cron Secret. Guard against a missing env var: without the `!secret`
  // check, an unset CRON_SECRET would make the comparison `Bearer undefined`,
  // which an attacker could send verbatim to bypass the gate.
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await recomputeLeaderboardScores();

    return NextResponse.json({
      success: true,
      updatedUsersCount: result.updatedUsersCount,
    });
  } catch (error) {
    console.error("Leaderboard Cron Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
