import { db } from "@/lib/db";

export type LeaderboardScoreInput = {
  userId: string;
  lcScore: number;
  githubScore: number;
  eventScore: number;
  totalScore: number;
};

export async function recomputeLeaderboardScores() {
  const weightConfig = await db.scoreWeight.findFirst();
  const lcWeight = weightConfig?.lcWeight ?? 0.33;
  const githubWeight = weightConfig?.githubWeight ?? 0.33;
  const eventWeight = weightConfig?.eventWeight ?? 0.34;

  const totalEvents = await db.event.count({
    where: {
      isPublished: true,
      eventDate: { lt: new Date() },
    },
  });

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

  const maxLc = Math.max(...userScores.map((u) => u.rawLc), 1);
  const maxGh = Math.max(...userScores.map((u) => u.rawGh), 1);

  const finalScores: LeaderboardScoreInput[] = userScores.map((u) => {
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

  finalScores.sort((a, b) => b.totalScore - a.totalScore);

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

  return { updatedUsersCount: finalScores.length };
}
