import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  AnnouncementCarousel,
  type Announcement,
} from "./_sections/AnnouncementCarousel";
import { StatsSection } from "./_sections/StatsSection";
import { AboutSection } from "./_sections/AboutSection";
import { EventsSection, type EventCardData } from "./_sections/EventsSection";
import {
  LeaderboardSection,
  type LeaderboardEntry,
} from "./_sections/LeaderboardSection";
import { ProjectsSection } from "./_sections/ProjectsSection";
import { MembersSection } from "./_sections/MembersSection";
import { languagesFromRecord } from "./_sections/stats-utils";
import { PixelLoadingScreen } from "@/components/ui/PixelLoadingScreen";

export const metadata = {
  title: "DNOrbit ~ DevNation",
};

function formatDate(date: Date): string {
  return date
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();
}

// Fuller date for the events grid cards, e.g. "JUL 15, 2026".
function formatEventDateLong(date: Date): string {
  return date
    .toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    })
    .toUpperCase();
}

// Server Component: fetch all page data here, map into client-ready shapes.
export default async function V2Page() {
  const session = await auth();
  const userId = session?.user?.id;
  const hasGithubToken = !!session?.user?.accessToken;
  const hasLcUsername = !!session?.user?.lcUsername;
  const isAdmin = session?.user?.role === "admin";

  // Published events feed two surfaces: the top announcement strip (first few)
  // and the full Events grid below the terminal. Fetched once, mapped twice.
  const events = await db.event.findMany({
    where: { isPublished: true },
    orderBy: { eventDate: "asc" },
    take: 12,
  });

  // Latest cached stats + leaderboard standing for the signed-in user.
  // leaderboardScore.userId is @unique → findUnique.
  const [githubStats, lcStats, leaderboardScore] = userId
    ? await Promise.all([
        db.githubStats.findFirst({
          where: { userId },
          orderBy: { fetchedAt: "desc" },
        }),
        db.lcStats.findFirst({
          where: { userId },
          orderBy: { fetchedAt: "desc" },
        }),
        db.leaderboardScore.findUnique({ where: { userId } }),
      ])
    : [null, null, null];

  const announcements: Announcement[] = events.slice(0, 6).map((e) => ({
    id: e.id,
    tag: (e.eventType ?? "EVENT").toUpperCase(),
    title: e.title,
    body: e.description,
    meta: [formatDate(e.eventDate), e.location].filter(Boolean).join(" · "),
  }));

  const eventCards: EventCardData[] = events.map((e) => ({
    id: e.id,
    type: (e.eventType ?? "EVENT").toUpperCase(),
    title: e.title,
    description: e.description,
    dateLabel: formatEventDateLong(e.eventDate),
    location: e.location,
    bannerUrl: e.bannerUrl,
  }));

  // Public leaderboard: top 20 *visible* users by computed total score. Display
  // rank is positional (1..N) so the board reads cleanly even if a hidden user
  // sits between visible ones in the global ranking. Empty until the nightly
  // recompute (or an admin trigger) has populated leaderboard_scores.
  const topScores = await db.leaderboardScore.findMany({
    where: { user: { isVisible: true } },
    orderBy: [{ totalScore: "desc" }],
    take: 20,
    include: { user: { select: { name: true, image: true } } },
  });

  const leaderboard: LeaderboardEntry[] = topScores.map((s, i) => ({
    rank: i + 1,
    name: s.user.name,
    image: s.user.image,
    score: Math.round(s.totalScore),
  }));

  return (
    <div className="min-h-screen">
      <PixelLoadingScreen mode="hero" />
      <AnnouncementCarousel announcements={announcements} />
      {/* PLAYER STATS is personal — only rendered for signed-in members. */}
      {userId && (
      <StatsSection
        userId={userId}
        isAdmin={isAdmin}
        hasGithubToken={hasGithubToken}
        hasLcUsername={hasLcUsername}
        github={
          githubStats
            ? {
                reposCount: githubStats.reposCount,
                totalCommits: githubStats.totalCommits,
                totalPrs: githubStats.totalPrs,
                totalStars: githubStats.totalStars,
                topLanguages: languagesFromRecord(
                  githubStats.topLanguages as Record<string, number>
                ),
                fetchedAt: githubStats.fetchedAt.toISOString(),
              }
            : null
        }
        leetcode={
          lcStats
            ? {
                totalSolved: lcStats.totalSolved,
                easySolved: lcStats.easySolved,
                mediumSolved: lcStats.mediumSolved,
                hardSolved: lcStats.hardSolved,
                lcRanking: lcStats.lcRanking,
                streak: lcStats.streak,
                fetchedAt: lcStats.fetchedAt.toISOString(),
              }
            : null
        }
        rank={
          leaderboardScore
            ? {
                rank: leaderboardScore.rank,
                totalScore: leaderboardScore.totalScore,
              }
            : null
        }
      />
      )}
      <AboutSection />
      <EventsSection events={eventCards} />
      <LeaderboardSection entries={leaderboard} />
      <ProjectsSection />
      <MembersSection />
    </div>
  );
}
