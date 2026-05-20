import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: userId } = await params;

    // Reset fetchedAt to Unix epoch (1970-01-01) for both stats to force a refetch on next load
    const pastDate = new Date(0);

    const [ghResult, lcResult] = await db.$transaction([
      db.githubStats.updateMany({
        where: { userId },
        data: { fetchedAt: pastDate },
      }),
      db.lcStats.updateMany({
        where: { userId },
        data: { fetchedAt: pastDate },
      }),
    ]);

    return NextResponse.json({ 
      success: true, 
      message: "Stats cache invalidated for user",
      updatedGithubRows: ghResult.count,
      updatedLcRows: lcResult.count
    });
  } catch (error) {
    console.error("Manual Stat Refresh Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
