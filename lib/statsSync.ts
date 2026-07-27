import { db } from "@/lib/db";
import { fetchGitHubStats } from "@/lib/github";
import { fetchLeetCodeStats } from "@/lib/lc-fetcher";

type SyncResult = {
  provider: "github" | "lc";
  userId: string;
  ok: boolean;
  detail: string;
};

export async function syncGitHubStatsForUser(
  userId: string,
  openSourceMinStars: number,
): Promise<SyncResult> {
  const account = await db.account.findFirst({
    where: {
      userId,
      provider: "github",
      access_token: {
        not: null,
      },
    },
  });

  if (!account?.access_token) {
    return {
      provider: "github" as const,
      userId,
      ok: false,
      detail: "NO_GITHUB_TOKEN",
    };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { githubUsername: true },
  });

  if (!user?.githubUsername) {
    return {
      provider: "github" as const,
      userId,
      ok: false,
      detail: "NO_GITHUB_USERNAME",
    };
  }

  try {
    // The account token belongs to this same user, so we can safely read their
    // private repositories for the leaderboard.
    const stats = await fetchGitHubStats(
      user.githubUsername,
      account.access_token,
      {
        includePrivate: true,
        openSourceMinStars,
      },
    );
    const existing = await db.githubStats.findFirst({ where: { userId } });
    const statsData = {
      reposCount: stats.reposCount,
      totalCommits: stats.totalCommits,
      totalPrs: stats.totalPrs,
      totalStars: stats.totalStars,
      openSourcePrs: stats.openSourcePrs,
      topLanguages: stats.topLanguages,
      fetchedAt: new Date(),
    };

    if (existing) {
      await db.githubStats.update({
        where: { id: existing.id },
        data: statsData,
      });
    } else {
      await db.githubStats.create({
        data: { userId, ...statsData },
      });
    }

    return {
      provider: "github" as const,
      userId,
      ok: true,
      detail: "REFRESHED",
    };
  } catch (error) {
    // One line per failure — a member with a revoked token 401s on every sync,
    // and a full stack dump per member per run makes the dev log unreadable.
    console.error(
      `[stats-sync] GitHub refresh failed for ${userId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return {
      provider: "github" as const,
      userId,
      ok: false,
      detail: "GITHUB_REFRESH_FAILED",
    };
  }
}

export async function syncLeetCodeStatsForUser(
  userId: string,
): Promise<SyncResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { lcUsername: true },
  });

  if (!user?.lcUsername) {
    return {
      provider: "lc" as const,
      userId,
      ok: false,
      detail: "NO_LEETCODE_USERNAME",
    };
  }

  try {
    const stats = await fetchLeetCodeStats(user.lcUsername);
    const existing = await db.lcStats.findFirst({ where: { userId } });
    const statsData = {
      totalSolved: stats.totalSolved,
      easySolved: stats.easySolved,
      mediumSolved: stats.mediumSolved,
      hardSolved: stats.hardSolved,
      lcRanking: stats.lcRanking,
      streak: stats.streak,
      fetchedAt: new Date(),
    };

    if (existing) {
      await db.lcStats.update({
        where: { id: existing.id },
        data: statsData,
      });
    } else {
      await db.lcStats.create({
        data: { userId, ...statsData },
      });
    }

    return {
      provider: "lc" as const,
      userId,
      ok: true,
      detail: "REFRESHED",
    };
  } catch (error) {
    console.error(
      `[stats-sync] LeetCode refresh failed for ${userId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return {
      provider: "lc" as const,
      userId,
      ok: false,
      detail: "LEETCODE_REFRESH_FAILED",
    };
  }
}
