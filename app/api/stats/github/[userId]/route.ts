// app/api/stats/github/[userId]/route.ts
// Module 2 — GitHub Stats Integration

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchGitHubStats } from "@/lib/github";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;

  // ── 1. Auth check ──────────────────────────────────────────
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.role === "admin";
  const isSelf = session.user.id === userId;

  if (!isSelf && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── 2. Get user + GitHub username ──────────────────────────
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      githubUsername: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.githubUsername) {
    return NextResponse.json(
      { error: "User has no GitHub username linked" },
      { status: 422 }
    );
  }

  // ── 3. Check cache ─────────────────────────────────────────
  const cached = await db.githubStats.findFirst({
    where: { userId },
    orderBy: { fetchedAt: "desc" },
  });

  const isFresh =
    cached &&
    Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS;

  if (isFresh) {
    return NextResponse.json({
      data: {
        ...cached,
        githubUsername: user.githubUsername,
      },
      source: "cache",
    });
  }

  // ── 4. Fetch from GitHub API ───────────────────────────────
  const accessToken = session.user.accessToken;

  if (!accessToken) {
    return NextResponse.json(
      { error: "No GitHub access token found in session" },
      { status: 500 }
    );
  }

  let stats;
  try {
    stats = await fetchGitHubStats(user.githubUsername, accessToken);
  } catch (err) {
    console.error("[github-stats] Failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch stats from GitHub" },
      { status: 502 }
    );
  }

  // ── 5. Save to DB ─────────────────────────────────────────
  const statsData = {
    reposCount: stats.reposCount,
    totalCommits: stats.totalCommits,
    totalPrs: stats.totalPrs,
    totalStars: stats.totalStars,
    topLanguages: stats.topLanguages,
    fetchedAt: new Date(),
  };

  const existing = await db.githubStats.findFirst({ where: { userId } });

  const saved = existing
    ? await db.githubStats.update({
        where: { id: existing.id },
        data: statsData,
      })
    : await db.githubStats.create({
        data: { userId, ...statsData },
      });

  // ── 6. Return response (WITH githubUsername) ───────────────
  return NextResponse.json({
    data: {
      ...saved,
      githubUsername: user.githubUsername,
    },
    source: "fresh",
  });
}
