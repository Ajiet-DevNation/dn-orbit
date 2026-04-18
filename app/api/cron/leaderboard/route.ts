import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  // Verify Cron Secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch score weights (fallback to 0.33/0.33/0.34 if missing)
    const weightConfig = await db.scoreWeight.findFirst();
    const lcWeight = weightConfig?.lcWeight ?? 0.33;
    const githubWeight = weightConfig?.githubWeight ?? 0.33;
    const eventWeight = weightConfig?.eventWeight ?? 0.34;

    // 2. Fetch total past published events (to fairly calculate event score)
    const totalEvents = await db.event.count({
      where: {
        isPublished: true,
        eventDate: { lt: new Date() },
      },
    });

    // 3. Fetch all users with their most recent stats and attended events
    const users = await db.user.findMany({
      include: {
        lcStats: {
          orderBy: { fetchedAt: "desc" },
          take: 1,
        },
        githubStats: {
          orderBy: { fetchedAt: "desc" },
          take: 1,
        },
        registrations: {
          where: { attended: true },
        },
      },
    });

    // 4. Calculate raw scores
    const userScores = users.map((user) => {
      const lc = user.lcStats[0];
      const gh = user.githubStats[0];

      const rawLc = lc ? lc.easySolved * 1 + lc.mediumSolved * 3 + lc.hardSolved * 5 : 0;
      const rawGh = gh ? gh.totalCommits + gh.totalPrs * 2 + gh.totalStars : 0;
      const rawEvent = totalEvents > 0 ? (user.registrations.length / totalEvents) * 100 : 0;

      return {
        userId: user.id,
        rawLc,
        rawGh,
        eventScore: rawEvent,
      };
    });

    // 5. Find maximums for normalisation (use 1 to prevent division by 0)
    const maxLc = Math.max(...userScores.map((u) => u.rawLc), 1);
    const maxGh = Math.max(...userScores.map((u) => u.rawGh), 1);

    // 6. Normalise and calculate final total scores
    const finalScores = userScores.map((u) => {
      const lcScore = (u.rawLc / maxLc) * 100;
      const githubScore = (u.rawGh / maxGh) * 100;
      const totalScore = lcScore * lcWeight + githubScore * githubWeight + u.eventScore * eventWeight;

      return {
        userId: u.userId,
        lcScore,
        githubScore,
        eventScore: u.eventScore,
        totalScore,
      };
    });

    // 7. Sort descending to assign ranks
    finalScores.sort((a, b) => b.totalScore - a.totalScore);

    // 8. Bulk upsert using a transaction
    await db.$transaction(
      finalScores.map((score, index) =>
        db.leaderboardScore.upsert({
          where: { userId: score.userId },
          update: {
            lcScore: score.lcScore,
            githubScore: score.githubScore,
            eventScore: score.eventScore,
            totalScore: score.totalScore,
            rank: index + 1,
            computedAt: new Date(),
          },
          create: {
            userId: score.userId,
            lcScore: score.lcScore,
            githubScore: score.githubScore,
            eventScore: score.eventScore,
            totalScore: score.totalScore,
            rank: index + 1,
          },
        })
      )
    );

    return NextResponse.json({ success: true, updatedUsersCount: finalScores.length });
  } catch (error) {
    console.error("Leaderboard Cron Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
