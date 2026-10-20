import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fetchGitHubStats } from "@/lib/github";
import { githubAccessToken } from "@/lib/github-token";
import { fetchLeetCodeStats } from "@/lib/lc-fetcher";

// One stats row per member, written in place. user_id isn't unique in the
// schema (the relation is a list), so a drain racing a manual refresh could
// insert a second row, and a later unordered findFirst then kept updating the
// OLD row while the board read the new one — stats looked frozen. Both writers
// below update the newest row and delete any strays, so duplicates self-heal.

type GithubStatsData = Omit<Prisma.GithubStatsCreateManyInput, "id" | "userId">;
type LcStatsData = Omit<Prisma.LcStatsCreateManyInput, "id" | "userId">;

export async function saveGithubStats(userId: string, data: GithubStatsData) {
  const [keep, ...strays] = await db.githubStats.findMany({
    where: { userId },
    orderBy: { fetchedAt: "desc" },
    select: { id: true },
  });
  const saved = keep
    ? await db.githubStats.update({ where: { id: keep.id }, data })
    : await db.githubStats.create({ data: { userId, ...data } });
  if (strays.length > 0) {
    await db.githubStats.deleteMany({
      where: { id: { in: strays.map((r) => r.id) } },
    });
  }
  return saved;
}

export async function saveLcStats(userId: string, data: LcStatsData) {
  const [keep, ...strays] = await db.lcStats.findMany({
    where: { userId },
    orderBy: { fetchedAt: "desc" },
    select: { id: true },
  });
  const saved = keep
    ? await db.lcStats.update({ where: { id: keep.id }, data })
    : await db.lcStats.create({ data: { userId, ...data } });
  if (strays.length > 0) {
    await db.lcStats.deleteMany({
      where: { id: { in: strays.map((r) => r.id) } },
    });
  }
  return saved;
}

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
  const accessToken = await githubAccessToken(userId);

  if (!accessToken) {
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
    const stats = await fetchGitHubStats(user.githubUsername, accessToken, {
      includePrivate: true,
      openSourceMinStars,
    });
    const statsData = {
      reposCount: stats.reposCount,
      totalCommits: stats.totalCommits,
      totalPrs: stats.totalPrs,
      totalStars: stats.totalStars,
      openSourcePrs: stats.openSourcePrs,
      topLanguages: stats.topLanguages,
      fetchedAt: new Date(),
    };

    await saveGithubStats(userId, statsData);

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
    const statsData = {
      totalSolved: stats.totalSolved,
      easySolved: stats.easySolved,
      mediumSolved: stats.mediumSolved,
      hardSolved: stats.hardSolved,
      lcRanking: stats.lcRanking,
      streak: stats.streak,
      fetchedAt: new Date(),
    };

    await saveLcStats(userId, statsData);

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
