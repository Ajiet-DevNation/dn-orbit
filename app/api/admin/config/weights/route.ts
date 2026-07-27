import { type NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/roles";
import { parseBody, scoreWeightsSchema } from "@/lib/validation";

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

    // Bounds each weight to 0–1 and requires the three to total 1.00 — the same
    // rule the admin WeightForm enforces client-side, which the server used to
    // skip entirely ("we will just blindly save them as numbers").
    const parsed = await parseBody(req, scoreWeightsSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const {
      githubWeight,
      lcWeight,
      eventWeight,
      ghOpenSourceMinStars,
      ghOpenSourcePerPrPoints,
    } = parsed.data;

    const openSourceData = {
      ...(ghOpenSourceMinStars !== undefined ? { ghOpenSourceMinStars } : {}),
      ...(ghOpenSourcePerPrPoints !== undefined
        ? { ghOpenSourcePerPrPoints }
        : {}),
    };

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
