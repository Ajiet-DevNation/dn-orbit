import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { LEADERBOARD_VISIBLE_USER_FILTER } from "@/lib/leaderboard";
import { PUBLIC_TAG } from "@/lib/public-tags";
import { isRecruitmentOpen } from "@/lib/recruitment-config";
import { lastSyncedAt } from "@/lib/sync";

// The landing page's public data, cached across requests. It is the most
// visited route and every view ran the same six queries; now a burst of
// visitors shares one result per tag.
//
// Freshness: every mutation that changes this data calls invalidatePublic()
// (lib/public-tags.ts) with the matching tag, and a 60s TTL bounds the staleness of anything that
// slips past. unstable_cache rather than `use cache`: the latter needs Cache
// Components switched on app-wide, which would put every auth()-reading
// layout behind Suspense.
//
// unstable_cache stores JSON, so Dates go in as ISO strings and are revived on
// the way out.

const TTL_S = 60;

const eventsCached = unstable_cache(
  async () => {
    const rows = await db.event.findMany({
      where: { reviewStatus: "approved", isPublished: true },
      orderBy: { eventDate: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        description: true,
        eventType: true,
        eventDate: true,
        location: true,
        bannerUrl: true,
        audience: true,
        capacity: true,
        registrationDeadline: true,
        _count: { select: { registrations: true } },
      },
    });
    return rows.map((e) => ({
      ...e,
      eventDate: e.eventDate.toISOString(),
      registrationDeadline: e.registrationDeadline?.toISOString() ?? null,
    }));
  },
  ["public-events-v1"],
  { tags: [PUBLIC_TAG.events], revalidate: TTL_S },
);

/** Newest 100 published events, with registration counts. */
export async function publicEvents() {
  return (await eventsCached()).map((e) => ({
    ...e,
    eventDate: new Date(e.eventDate),
    registrationDeadline: e.registrationDeadline
      ? new Date(e.registrationDeadline)
      : null,
  }));
}

/** Top 100 visible members by total score. */
export const publicLeaderboard = unstable_cache(
  () =>
    db.leaderboardScore.findMany({
      where: { user: LEADERBOARD_VISIBLE_USER_FILTER },
      orderBy: [{ totalScore: "desc" }],
      take: 100,
      select: {
        totalScore: true,
        githubScore: true,
        lcScore: true,
        eventScore: true,
        user: { select: { name: true, image: true, githubUsername: true } },
      },
    }),
  ["public-leaderboard-v1"],
  { tags: [PUBLIC_TAG.leaderboard], revalidate: TTL_S },
);

/** Newest 100 admin-approved projects. */
export const publicProjects = unstable_cache(
  () =>
    db.project.findMany({
      where: { reviewStatus: "approved" },
      orderBy: { submittedAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        imageUrl: true,
        description: true,
        techStack: true,
        githubRepoUrl: true,
        demoUrl: true,
        status: true,
        progressPct: true,
      },
    }),
  ["public-projects-v1"],
  { tags: [PUBLIC_TAG.projects], revalidate: TTL_S },
);

const syncedAtCached = unstable_cache(
  async () => (await lastSyncedAt())?.toISOString() ?? null,
  ["public-synced-at-v1"],
  { tags: [PUBLIC_TAG.leaderboard], revalidate: TTL_S },
);

/** When the leaderboard last recomputed (the board's freshness readout). */
export async function publicSyncedAt(): Promise<Date | null> {
  const iso = await syncedAtCached();
  return iso ? new Date(iso) : null;
}

/** Recruitment switch, for the landing page's banner/popup only. The apply
 *  route and /recruitments read it uncached. */
export const publicRecruitmentOpen = unstable_cache(
  isRecruitmentOpen,
  ["public-recruitment-open-v1"],
  { tags: [PUBLIC_TAG.recruitment], revalidate: TTL_S },
);
