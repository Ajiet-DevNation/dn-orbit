// app/api/stats/github/[userId]/route.ts
// Module 2 — GitHub Stats Integration
//
// GET /api/stats/github/[userId]
//
// Logic:
//   1. Verify the requester is logged in (and is either the same user or an admin)
//   2. Check if a cached github_stats row exists and is < 24h old
//   3. If fresh → return cached data from DB
//   4. If stale / missing → call GitHub API, save to DB, return fresh data

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchGitHubStats } from "@/lib/github";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// ─── GET /api/stats/github/[userId] ──────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;

  // ── 1. Auth check ──────────────────────────────────────────────────────────
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only allow the user themselves or an admin to fetch stats
  const isAdmin = session.user.role === "admin";
  const isSelf = session.user.id === userId;

  if (!isSelf && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── 2. Look up the user in DB to get their GitHub username ─────────────────
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

  // ── 3. Check cache (github_stats table) ───────────────────────────────────
  const cached = await db.githubStats.findFirst({
    where: { userId },
    orderBy: { fetchedAt: "desc" },
  });

  const isFresh =
    cached &&
    Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS;

  if (isFresh) {
    return NextResponse.json({ data: cached, source: "cache" });
  }

  // ── 4. Cache is stale or missing — fetch from GitHub API ──────────────────
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
    console.error("[github-stats] Failed to fetch from GitHub API:", err);
    return NextResponse.json(
      { error: "Failed to fetch stats from GitHub" },
      { status: 502 }
    );
  }

  // ── 5. Save fresh stats to DB (upsert — replace old row if it existed) ────
  const saved = await db.githubStats.upsert({
    where: { userId },
    update: {
      reposCount: stats.reposCount,
      totalCommits: stats.totalCommits,
      totalPrs: stats.totalPrs,
      totalStars: stats.totalStars,
      topLanguages: stats.topLanguages,
      fetchedAt: new Date(),
    },
    create: {
      userId,
      reposCount: stats.reposCount,
      totalCommits: stats.totalCommits,
      totalPrs: stats.totalPrs,
      totalStars: stats.totalStars,
      topLanguages: stats.topLanguages,
      fetchedAt: new Date(),
    },
  });

  return NextResponse.json({ data: saved, source: "fresh" });
}
