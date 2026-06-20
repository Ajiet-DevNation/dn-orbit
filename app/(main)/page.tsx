import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";
import { toTitleCase } from "@/lib/names";
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
import { Footer } from "./_sections/Footer";
import { PROJECTS as scrapedProjects, type ProjectData } from "@/constants/projects";
import { languagesFromRecord } from "./_sections/stats-utils";
import { PixelLoadingScreen } from "@/components/ui/PixelLoadingScreen";

export const metadata = {
  // Absolute title so the home page reads cleanly (no "%s — ORBIT" template).
  title: { absolute: "ORBIT — DevNation · Leaderboard, Events, Projects & Members" },
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
  const isAdmin = canAccessAdmin(session?.user?.role);

  // Published events feed two surfaces: the top announcement strip (first 6) and
  // the full Events grid below the terminal, which paginates (6/page) and is
  // searchable client-side. Fetched once, mapped twice. Capped at 100 — a
  // generous bound (mirroring the leaderboard cap) that keeps the payload small
  // while comfortably covering realistic event volumes.
  const events = await db.event.findMany({
    where: { reviewStatus: "approved", isPublished: true },
    orderBy: { eventDate: "asc" },
    take: 100,
    include: { _count: { select: { registrations: true } } },
  });

  // Latest cached stats + leaderboard standing for the signed-in user.
  // leaderboardScore.userId is @unique → findUnique.
  const [githubStats, lcStats, leaderboardScore, ghAccount] = userId
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
        db.account.findFirst({
          where: { userId, provider: "github" },
          select: { scope: true },
        }),
      ])
    : [null, null, null, null];

  // Members who signed in before private-repo support hold a token without the
  // `repo` scope. Detect that so the Player Stats refresh button can offer a
  // one-click re-authorize. GitHub returns granted scopes comma- or
  // space-delimited, so we split on either.
  const hasRepoScope = !!ghAccount?.scope
    ?.split(/[\s,]+/)
    .includes("repo");

  const announcements: Announcement[] = events.slice(0, 6).map((e) => ({
    id: e.id,
    tag: (e.eventType ?? "EVENT").toUpperCase(),
    title: e.title,
    body: e.description,
    meta: [formatDate(e.eventDate), e.location].filter(Boolean).join(" · "),
  }));

  const eventCards: EventCardData[] = events.map((e) => {
    const deadline = e.registrationDeadline ?? e.eventDate;
    const full = e.capacity != null && e._count.registrations >= e.capacity;
    return {
      id: e.id,
      type: (e.eventType ?? "EVENT").toUpperCase(),
      title: e.title,
      description: e.description,
      dateLabel: formatEventDateLong(e.eventDate),
      location: e.location,
      bannerUrl: e.bannerUrl,
      audience: e.audience as EventCardData["audience"],
      capacityLabel:
        e.capacity != null ? `${e._count.registrations} / ${e.capacity} registered` : null,
      registrationClosed: full || (deadline ? new Date() > deadline : false),
    };
  });

  // Public leaderboard: top 20 *visible* users by computed total score. Display
  // rank is positional (1..N) so the board reads cleanly even if a hidden user
  // sits between visible ones in the global ranking. Empty until the nightly
  // recompute (or an admin trigger) has populated leaderboard_scores.
  // Up to 100 ranked members — the board paginates these client-side in pages of
  // 10 (Top 1–10, 11–20, …). 100 is a generous cap that keeps the payload small
  // while covering realistic club sizes.
  const topScores = await db.leaderboardScore.findMany({
    where: { user: { isVisible: true, status: "approved" } },
    orderBy: [{ totalScore: "desc" }],
    take: 100,
    include: { user: { select: { name: true, image: true } } },
  });

  const leaderboard: LeaderboardEntry[] = topScores.map((s, i) => ({
    rank: i + 1,
    name: toTitleCase(s.user.name),
    image: s.user.image,
    score: Math.round(s.totalScore),
    githubScore: Math.round(s.githubScore),
    lcScore: Math.round(s.lcScore),
    eventScore: Math.round(s.eventScore),
  }));

  // The player's "GLOBAL STANDING" must agree with the public board, so we
  // derive it from the *same* population the board ranks over (visible, approved
  // members) instead of trusting leaderboardScore.rank — that stored rank is
  // computed across *every* user (hidden/pending/rejected included), so a hidden
  // member who outscores you would inflate it by one. Counting members who
  // strictly outscore the player (+1) is also immune to stale nightly recomputes
  // and manual DB deletions.
  const playerRank =
    userId && leaderboardScore
      ? (await db.leaderboardScore.count({
          where: {
            user: { isVisible: true, status: "approved" },
            totalScore: { gt: leaderboardScore.totalScore },
          },
        })) + 1
      : null;

  // Member-submitted, admin-approved projects (with uploaded cover images) shown
  // in the public carousel alongside the GitHub-org scraped projects.
  const dbProjects = await db.project.findMany({
    where: { reviewStatus: "approved" },
    orderBy: { submittedAt: "desc" },
  });
  const PROJECT_STATUS_LABEL: Record<string, string> = {
    planning: "WIP",
    active: "ACTIVE",
    completed: "SHIPPED",
    stalled: "STALLED",
  };
  const submittedProjects: ProjectData[] = dbProjects.map((p) => ({
    id: p.id,
    title: p.title.toUpperCase(),
    imageUrl: p.imageUrl,
    description: p.description ?? "",
    techStack: Array.isArray(p.techStack) ? (p.techStack as string[]) : [],
    githubUrl: p.githubRepoUrl,
    demoUrl: p.demoUrl,
    status: PROJECT_STATUS_LABEL[p.status] ?? "ACTIVE",
  }));
  const projects: ProjectData[] = [...submittedProjects, ...scrapedProjects];

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
        hasRepoScope={hasRepoScope}
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
                rank: playerRank,
                totalScore: leaderboardScore.totalScore,
              }
            : null
        }
      />
      )}
      <AboutSection />
      <EventsSection events={eventCards} />
      <LeaderboardSection entries={leaderboard} />
      <ProjectsSection projects={projects} />
      <MembersSection />
      <Footer />
    </div>
  );
}
