import { type NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/roles";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !canAccessAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const weights = await db.scoreWeight.findFirst();
    if (!weights) {
      // Return defaults if not set in database
      return NextResponse.json({
        githubWeight: 0.33,
        lcWeight: 0.33,
        eventWeight: 0.34,
        ghOpenSourceMinStars: 10,
        ghOpenSourcePerPrPoints: 10,
      });
    }

    return NextResponse.json(weights);
  } catch (error) {
    console.error("Get Weights Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !canAccessAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      githubWeight,
      lcWeight,
      eventWeight,
      ghOpenSourceMinStars,
      ghOpenSourcePerPrPoints,
    } = body;

    if (
      typeof githubWeight !== "number" ||
      typeof lcWeight !== "number" ||
      typeof eventWeight !== "number"
    ) {
      return NextResponse.json(
        { error: "githubWeight, lcWeight, and eventWeight must be numbers" },
        { status: 400 },
      );
    }

    // Open-source knobs are optional in the payload; when present they must be
    // sane (non-negative; min-stars a whole number). They live alongside the
    // weights because they tune the GitHub component, not a separate axis.
    if (
      ghOpenSourceMinStars !== undefined &&
      (typeof ghOpenSourceMinStars !== "number" ||
        !Number.isInteger(ghOpenSourceMinStars) ||
        ghOpenSourceMinStars < 0)
    ) {
      return NextResponse.json(
        { error: "ghOpenSourceMinStars must be a non-negative integer" },
        { status: 400 },
      );
    }
    if (
      ghOpenSourcePerPrPoints !== undefined &&
      (typeof ghOpenSourcePerPrPoints !== "number" ||
        ghOpenSourcePerPrPoints < 0)
    ) {
      return NextResponse.json(
        { error: "ghOpenSourcePerPrPoints must be a non-negative number" },
        { status: 400 },
      );
    }

    const openSourceData = {
      ...(ghOpenSourceMinStars !== undefined ? { ghOpenSourceMinStars } : {}),
      ...(ghOpenSourcePerPrPoints !== undefined
        ? { ghOpenSourcePerPrPoints }
        : {}),
    };

    // Ensure weights sum approximately to 1 or 100% depending on the formula,
    // but we will just blindly save them as numbers as per CMS spec.
    const existingWeights = await db.scoreWeight.findFirst();

    void logAudit({
      action: "weights.update",
      actorId: session.user.id,
      actorName: session.user.name,
      summary: `Updated leaderboard weights · GH ${Math.round(githubWeight * 100)}% · LC ${Math.round(lcWeight * 100)}% · EVT ${Math.round(eventWeight * 100)}%`,
    });

    if (existingWeights) {
      const updated = await db.scoreWeight.update({
        where: { id: existingWeights.id },
        data: {
          githubWeight,
          lcWeight,
          eventWeight,
          ...openSourceData,
          updatedBy: session.user.id,
        },
      });
      return NextResponse.json({ success: true, weights: updated });
    } else {
      const created = await db.scoreWeight.create({
        data: {
          githubWeight,
          lcWeight,
          eventWeight,
          ...openSourceData,
          updatedBy: session.user.id,
        },
      });
      return NextResponse.json({ success: true, weights: created });
    }
  } catch (error) {
    console.error("Update Weights Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
