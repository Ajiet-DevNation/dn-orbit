import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  AnnouncementCarousel,
  type Announcement,
} from "./_sections/AnnouncementCarousel";
import { StatsSection } from "./_sections/StatsSection";
import { AboutSection } from "./_sections/AboutSection";
import { languagesFromRecord } from "./_sections/stats-utils";
import { PixelLoadingScreen } from "@/components/ui/PixelLoadingScreen";

export const metadata = {
  title: "ORBIT V2 — DevNation",
};

function formatDate(date: Date): string {
  return date
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();
}

// Server Component: fetch all page data here, map into client-ready shapes.
export default async function V2Page() {
  const session = await auth();
  const userId = session?.user?.id;
  const hasGithubToken = !!session?.user?.accessToken;
  const hasLcUsername = !!session?.user?.lcUsername;
  const isAdmin = session?.user?.role === "admin";

  // Events are currently the only live announcement source. The carousel is
  // source-agnostic, so other announcement types can be merged in here later.
  const events = await db.event.findMany({
    where: { isPublished: true },
    orderBy: { eventDate: "asc" },
    take: 6,
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

  const announcements: Announcement[] = events.map((e) => ({
    id: e.id,
    tag: (e.eventType ?? "EVENT").toUpperCase(),
    title: e.title,
    body: e.description,
    meta: [formatDate(e.eventDate), e.location].filter(Boolean).join(" · "),
  }));

  return (
    <div className="min-h-screen">
      <PixelLoadingScreen mode="hero" />
      <AnnouncementCarousel announcements={announcements} />
      <StatsSection
        userId={userId ?? ""}
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
      <AboutSection />
    </div>
  );
}
