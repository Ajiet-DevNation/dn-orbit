import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const weights = await db.scoreWeight.findFirst();
    if (!weights) {
      // Return defaults if not set in database
      return NextResponse.json({
        githubWeight: 0.33,
        lcWeight: 0.33,
        eventWeight: 0.34,
      });
    }

    return NextResponse.json(weights);
  } catch (error) {
    console.error("Get Weights Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { githubWeight, lcWeight, eventWeight } = body;

    if (
      typeof githubWeight !== "number" ||
      typeof lcWeight !== "number" ||
      typeof eventWeight !== "number"
    ) {
      return NextResponse.json(
        { error: "githubWeight, lcWeight, and eventWeight must be numbers" },
        { status: 400 }
      );
    }

    // Ensure weights sum approximately to 1 or 100% depending on the formula, 
    // but we will just blindly save them as numbers as per CMS spec.
    const existingWeights = await db.scoreWeight.findFirst();

    if (existingWeights) {
      const updated = await db.scoreWeight.update({
        where: { id: existingWeights.id },
        data: {
          githubWeight,
          lcWeight,
          eventWeight,
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
          updatedBy: session.user.id,
        },
      });
      return NextResponse.json({ success: true, weights: created });
    }
  } catch (error) {
    console.error("Update Weights Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
