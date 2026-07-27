import { AboutSection } from "@/components/home/AboutSection";
import {
  type Announcement,
  AnnouncementCarousel,
} from "@/components/home/AnnouncementCarousel";
import {
  type EventCardData,
  EventsSection,
} from "@/components/home/EventsSection";
import { HeroOrbit } from "@/components/home/HeroOrbit";
import {
  type LeaderboardEntry,
  LeaderboardSection,
} from "@/components/home/LeaderboardSection";
import { MembersSection } from "@/components/home/MembersSection";
import { ProjectsSection } from "@/components/home/ProjectsSection";
import { StatsSection } from "@/components/home/StatsSection";
import { StatsSyncPing } from "@/components/home/StatsSyncPing";
import { Footer } from "@/components/layout/Footer";
import {
  type ProjectData,
  PROJECTS as scrapedProjects,
} from "@/constants/projects";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  formatEventDateLong,
  formatEventDateShort,
  formatEventDateTime,
  formatEventTime,
} from "@/lib/event-format";
import { LEADERBOARD_VISIBLE_USER_FILTER } from "@/lib/leaderboard";
import { toTitleCase } from "@/lib/names";
import { canAccessAdmin } from "@/lib/roles";
import { languagesFromRecord } from "@/lib/stats-utils";
import { lastSyncedAt } from "@/lib/sync";

export const metadata = {
  // Absolute title so the home page reads cleanly (no "%s — ORBIT" template).
  title: {
    absolute: "ORBIT · DevNation · Leaderboard, Events, Projects & Members",
  },
};

// Server Component: fetch all page data here, map into client-ready shapes.
export default async function V2Page() {
  const session = await auth();
  const userId = session?.user?.id;
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
          where: { userId, provider: "github", access_token: { not: null } },
          select: { scope: true },
        }),
      ])
    : [null, null, null, null];

  // A GitHub account row with a token means we can pull the member's stats. The
  // token itself never leaves the server — only this boolean reaches the client.
  const hasGithubToken = !!ghAccount;

  // Members who signed in before private-repo support hold a token without the
  // `repo` scope. Detect that so the Player Stats refresh button can offer a
  // one-click re-authorize. GitHub returns granted scopes comma- or
  // space-delimited, so we split on either.
  const hasRepoScope = !!ghAccount?.scope?.split(/[\s,]+/).includes("repo");

  const announcements: Announcement[] = events.slice(0, 6).map((e) => ({
    id: e.id,
    tag: (e.eventType ?? "EVENT").toUpperCase(),
    title: e.title,
    body: e.description,
    meta: [formatEventDateShort(e.eventDate), e.location]
      .filter(Boolean)
      .join(" · "),
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
      timeLabel: formatEventTime(e.eventDate),
      location: e.location,
      bannerUrl: e.bannerUrl,
      audience: e.audience as EventCardData["audience"],
      registeredCount: e._count.registrations,
      capacity: e.capacity,
      // Only surface an explicitly-set deadline. Falling back to the event date
      // (as the closed-check does) would show every event a "register by" line
      // the organizer never wrote.
      deadlineLabel: e.registrationDeadline
        ? formatEventDateTime(e.registrationDeadline)
        : null,
      isFull: full,
      registrationClosed: full || (deadline ? new Date() > deadline : false),
    };
  });

  // Public leaderboard: top 20 *visible* users by computed total score. Display
  // rank is positional (1..N) so the board reads cleanly even if a hidden user
  // sits between visible ones in the global ranking. Membership is governed by
  // LEADERBOARD_VISIBLE_USER_FILTER (onboarded-or-approved), so a newly-joined
  // member appears within one cron cycle (≤15 min) of finishing onboarding —
  // no manual approval needed. Up to 100 ranked members — the board paginates
  // these client-side in pages of 10 (Top 1–10, 11–20, …). 100 is a generous
  // cap that keeps the payload small while covering realistic club sizes.
  const topScores = await db.leaderboardScore.findMany({
    where: { user: LEADERBOARD_VISIBLE_USER_FILTER },
    orderBy: [{ totalScore: "desc" }],
    take: 100,
    include: {
      user: { select: { name: true, image: true, githubUsername: true } },
    },
  });

  const leaderboard: LeaderboardEntry[] = topScores.map((s, i) => ({
    rank: i + 1,
    name: toTitleCase(s.user.name),
    username: s.user.githubUsername,
    image: s.user.image,
    score: Math.round(s.totalScore),
    githubScore: Math.round(s.githubScore),
    lcScore: Math.round(s.lcScore),
    eventScore: Math.round(s.eventScore),
  }));

  // The player's "GLOBAL STANDING" must agree with the public board, so we
  // derive it from the *same* population the board ranks over (the shared
  // LEADERBOARD_VISIBLE_USER_FILTER) instead of trusting leaderboardScore.rank —
  // that stored rank is computed across *every* user (hidden/rejected included),
  // so a hidden member who outscores you would inflate it by one. Counting
  // members who strictly outscore the player (+1) is also immune to stale
  // recomputes and manual DB deletions.
  const playerRank =
    userId && leaderboardScore
      ? (await db.leaderboardScore.count({
          where: {
            user: LEADERBOARD_VISIBLE_USER_FILTER,
            totalScore: { gt: leaderboardScore.totalScore },
          },
        })) + 1
      : null;

  // Member-submitted, admin-approved projects (with uploaded cover images) shown
  // in the public carousel alongside the GitHub-org scraped projects.
  const dbProjects = await db.project.findMany({
    where: { reviewStatus: "approved" },
    orderBy: { submittedAt: "desc" },
    // Bounded like the events and leaderboard queries above — this page is the
    // most-requested route in the app and must not grow an unbounded payload.
    take: 100,
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
    progressPct: p.progressPct,
  }));
  const projects: ProjectData[] = [...submittedProjects, ...scrapedProjects];

  // Only the leaderboard's freshness readout needs a extra query now — the hero
  // stat ticker was removed, and with it the member-count and commit-sum
  // aggregates it needed.
  const syncedAt = await lastSyncedAt();

  return (
    <div className="min-h-screen">
      {/* Kicks off a background stats refresh when the cache is stale — the
          SWR replacement for the old GitHub Actions cron (see lib/sync.ts). */}
      <StatsSyncPing />
      <HeroOrbit />
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
                  openSourcePrs: githubStats.openSourcePrs,
                  topLanguages: languagesFromRecord(
                    githubStats.topLanguages as Record<string, number>,
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
      <LeaderboardSection
        entries={leaderboard}
        syncedAt={syncedAt?.toISOString() ?? null}
      />
      <ProjectsSection projects={projects} />
      <MembersSection />
      <Footer />
    </div>
  );
}
