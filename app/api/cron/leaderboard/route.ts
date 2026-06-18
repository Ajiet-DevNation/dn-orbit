import { NextRequest, NextResponse } from "next/server";
import { recomputeLeaderboardScores } from "@/lib/leaderboard";

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

    return NextResponse.json({ success: true, updatedUsersCount: result.updatedUsersCount });
  } catch (error) {
    console.error("Leaderboard Cron Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
