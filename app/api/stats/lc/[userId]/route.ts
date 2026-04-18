<<<<<<< HEAD
// app/api/stats/lc/[userId]/route.ts
=======
// app/api/statscms/lc/[userId]/route.ts
>>>>>>> 9cf57ee (feature/auth/githubint (#8))

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchLeetCodeStats } from "@/lib/lc-fetcher";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    const { userId } = await params;

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

    // ── 2. Get user + LeetCode username ────────────────────────
    const user = await db.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            lcUsername: true,
        },
    });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.lcUsername) {
        return NextResponse.json(
            { error: "User has no LeetCode username linked" },
            { status: 422 }
        );
    }

    // ── 3. Check cache ─────────────────────────────────────────
    const cached = await db.lcStats.findFirst({
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
                lcUsername: user.lcUsername,
            },
            source: "cache",
        });
    }

    // ── 4. Fetch from external GraphQL API ─────────────────────
    let stats;
    try {
        stats = await fetchLeetCodeStats(user.lcUsername);
    } catch (err) {
        console.error("[lc-stats] Failed:", err);
        return NextResponse.json(
            { error: "Failed to fetch stats from LeetCode" },
            { status: 502 }
        );
    }

    // ── 5. Save to DB ──────────────────────────────────────────
    const statsData = {
        totalSolved: stats.totalSolved,
        easySolved: stats.easySolved,
        mediumSolved: stats.mediumSolved,
        hardSolved: stats.hardSolved,
        lcRanking: stats.lcRanking,
        streak: stats.streak,
        fetchedAt: new Date(),
    };

    const existing = await db.lcStats.findFirst({ where: { userId } });

    const saved = existing
        ? await db.lcStats.update({
            where: { id: existing.id },
            data: statsData,
        })
        : await db.lcStats.create({
            data: { userId, ...statsData },
        });

    // ── 6. Return response ─────────────────────────────────────
    return NextResponse.json({
        data: {
            ...saved,
            lcUsername: user.lcUsername,
        },
        source: "fresh",
    });
}
