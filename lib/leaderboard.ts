import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  computeLeaderboard,
  type ScoringUserInput,
} from "@/lib/leaderboard-scoring";

// Who the *public* leaderboard shows. A member appears as soon as they finish
// onboarding (they have an `lcUsername`) — they no longer wait on an admin to
// flip their status to "approved", so a newly-joined member surfaces within one
// cron cycle (≤15 min) instead of staying invisible until manual approval. The
// admin-approval gate still governs everything else (event registration,
// uploads, project/event submission); this only relaxes board visibility.
//
//   isVisible        — the member hasn't hidden themselves from the board.
//   status ≠ rejected — a rejected member never appears, even if onboarded.
//   approved OR onboarded — approved members (incl. bootstrap admins without an
//                          lcUsername yet) plus any member who has onboarded.
export const LEADERBOARD_VISIBLE_USER_FILTER: Prisma.UserWhereInput = {
  isVisible: true,
  status: { not: "rejected" },
  OR: [{ status: "approved" }, { lcUsername: { not: null } }],
};

export async function recomputeLeaderboardScores() {
  const weightConfig = await db.scoreWeight.findFirst();
  const weights = {
    lcWeight: weightConfig?.lcWeight ?? 0.33,
    githubWeight: weightConfig?.githubWeight ?? 0.33,
    eventWeight: weightConfig?.eventWeight ?? 0.34,
    githubOpenSourcePerPrPoints: weightConfig?.ghOpenSourcePerPrPoints ?? 10,
  };

  const now = new Date();
  const eventFilter = { isPublished: true, eventDate: { lt: now } } as const;

  const totalEvents = await db.event.count({ where: eventFilter });

  const users = await db.user.findMany({
    include: {
      lcStats: { orderBy: { fetchedAt: "desc" }, take: 1 },
      githubStats: { orderBy: { fetchedAt: "desc" }, take: 1 },
      // Count only attendance at events that also count toward `totalEvents`
      // (published and already past), so the numerator and denominator agree and
      // the ratio can't exceed 100%.
      registrations: { where: { attended: true, event: eventFilter } },
    },
  });

  const scoringInput: ScoringUserInput[] = users.map((user) => ({
    userId: user.id,
    lc: user.lcStats[0]
      ? {
          easySolved: user.lcStats[0].easySolved,
          mediumSolved: user.lcStats[0].mediumSolved,
          hardSolved: user.lcStats[0].hardSolved,
        }
      : null,
    gh: user.githubStats[0]
      ? {
          totalCommits: user.githubStats[0].totalCommits,
          totalPrs: user.githubStats[0].totalPrs,
          totalStars: user.githubStats[0].totalStars,
          openSourcePrs: user.githubStats[0].openSourcePrs,
        }
      : null,
    attendedCount: user.registrations.length,
  }));

  const finalScores = computeLeaderboard(scoringInput, weights, totalEvents);

  await db.$transaction(
    finalScores.map((score) =>
      db.leaderboardScore.upsert({
        where: { userId: score.userId },
        update: {
          lcScore: score.lcScore,
          githubScore: score.githubScore,
          eventScore: score.eventScore,
          totalScore: score.totalScore,
          rank: score.rank,
          computedAt: new Date(),
        },
        create: {
          userId: score.userId,
          lcScore: score.lcScore,
          githubScore: score.githubScore,
          eventScore: score.eventScore,
          totalScore: score.totalScore,
          rank: score.rank,
        },
      })
    )
  );

  return { updatedUsersCount: finalScores.length };
}
