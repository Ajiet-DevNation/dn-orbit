import type { Prisma } from "@prisma/client";
import { after } from "next/server";
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

// Arbitrary app-wide key for the recompute advisory lock.
const LEADERBOARD_LOCK_KEY = 4_204_201;

export async function recomputeLeaderboardScores() {
  const weightConfig = await db.scoreWeight.findFirst();
  const weights = {
    lcWeight: weightConfig?.lcWeight ?? 0.33,
    githubWeight: weightConfig?.githubWeight ?? 0.33,
    eventWeight: weightConfig?.eventWeight ?? 0.34,
    githubOpenSourcePerPrPoints: weightConfig?.ghOpenSourcePerPrPoints ?? 10,
  };

  const now = new Date();
  // Same visibility rule as the public site (approved AND published), so an
  // event still in moderation can't count toward anyone's attendance ratio.
  const eventFilter = {
    isPublished: true,
    reviewStatus: "approved",
    eventDate: { lt: now },
  } as const;

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

  // Replace the whole board in one atomic swap. The previous per-user upsert
  // batch issued 2×N statements inside one transaction; over a high-latency
  // pooled connection (Neon) that blew Prisma's 5s transaction budget once the
  // cohort grew. delete+createMany is two statements total — latency-immune —
  // and readers still never observe a half-written board.
  //
  // The advisory lock serialises concurrent recomputes (a stats drain racing an
  // admin weight change). Without it, the second swap's deleteMany could miss
  // rows the first had just inserted and its createMany would hit the unique
  // userId — failing the second run. Released automatically at commit.
  const computedAt = new Date();
  await db.$transaction([
    db.$executeRaw`SELECT 1 FROM pg_advisory_xact_lock(${LEADERBOARD_LOCK_KEY}::bigint)`,
    db.leaderboardScore.deleteMany({}),
    db.leaderboardScore.createMany({
      data: finalScores.map((score) => ({
        userId: score.userId,
        lcScore: score.lcScore,
        githubScore: score.githubScore,
        eventScore: score.eventScore,
        totalScore: score.totalScore,
        rank: score.rank,
        computedAt,
      })),
    }),
  ]);

  return { updatedUsersCount: finalScores.length };
}

// Recompute once the response is out (weights, attendance or event visibility
// changed). Scores were otherwise only rebuilt when someone's GitHub/LeetCode
// stats moved, so an admin edit could sit unreflected on the board for hours.
export function recomputeLeaderboardAfterResponse(): void {
  after(async () => {
    try {
      await recomputeLeaderboardScores();
    } catch (error) {
      console.error("[leaderboard] recompute failed:", error);
    }
  });
}
