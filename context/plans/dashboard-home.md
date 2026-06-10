# Plan: Dashboard Home Page

**Route:** `/dashboard`  
**File:** `app/(dashboard)/dashboard/page.tsx`  
**Owner:** Twaha (Module 8)  
**Theme:** Tactical Archive (see `context/STYLE_GUIDE.md` — Theme 2)

---

## What this page does

The first screen a logged-in member sees after login/onboarding. It shows:
1. Their leaderboard rank + score breakdown at a glance
2. Their GitHub stats (commits, PRs, stars, repos, top languages)
3. Their LeetCode stats (easy/medium/hard solved, streak, ranking)
4. Next 3 upcoming published events

---

## Route setup required (do this first)

The `(dashboard)` route group doesn't exist yet. Before building this page, create:

```
app/
  (dashboard)/
    layout.tsx        ← sidebar layout (copy structure from app/admin/layout.tsx)
    dashboard/
      page.tsx        ← this page
```

Also update two redirects so users land at `/dashboard` after auth:
- `app/onboarding/page.tsx` line 22: change `router.push("/")` → `router.push("/dashboard")`
- `proxy.ts`: the post-login redirect for onboarded users already goes to `/` — change it to `/dashboard`

> ⚠️ Do NOT touch any API routes or backend logic. Just update the two redirect strings above.

---

## Layout file: `app/(dashboard)/layout.tsx`

Copy the sidebar structure from `app/admin/layout.tsx` with these changes:

| Admin sidebar | Member sidebar |
|--------------|----------------|
| Version tag: `COMMAND_SEC_V4` | Version tag: `MEMBER_SECTOR_V1` |
| Nav: OVERVIEW, MEMBERS, EVENTS, PROJECTS, LEADERBOARD, SETTINGS | Nav: DASHBOARD, LEADERBOARD, EVENTS, MEMBERS, PROJECTS |
| Session label: `ADM_SESSION` in red | Session label: `USR_SESSION` in zinc |
| Admin redirect guard | No role check needed (middleware handles it) |

Nav items for the member sidebar:
```tsx
const navItems = [
  { label: "DASHBOARD",    href: "/dashboard",    icon: LayoutDashboard },
  { label: "LEADERBOARD",  href: "/leaderboard",  icon: Trophy },
  { label: "EVENTS",       href: "/events",        icon: Calendar },
  { label: "MEMBERS",      href: "/members",       icon: Users },
  { label: "PROJECTS",     href: "/projects",      icon: Rocket },
];
```

Active link detection: use `usePathname()` (needs `"use client"` on the nav part, or wrap in a client component).

---

## Data fetching: `app/(dashboard)/dashboard/page.tsx`

This is a **Server Component**. Fetch all data directly from the DB — do not call the API routes from server-side code.

```ts
const session = await auth();
// redirect to /login if no session (middleware handles this, but be safe)

const userId = session.user.id;

// Fetch in parallel
const [leaderboardScore, githubStats, lcStats, upcomingEvents] = await Promise.all([
  db.leaderboardScore.findUnique({ where: { userId } }),

  db.githubStats.findFirst({
    where: { userId },
    orderBy: { fetchedAt: "desc" },
  }),

  db.lcStats.findFirst({
    where: { userId },
    orderBy: { fetchedAt: "desc" },
  }),

  db.event.findMany({
    where: {
      isPublished: true,
      eventDate: { gte: new Date() },
    },
    orderBy: { eventDate: "asc" },
    take: 3,
  }),
]);
```

All models are in `prisma/schema.prisma`. Import `db` from `lib/db.ts`.

**Stale stats notice:** If `githubStats?.fetchedAt` or `lcStats?.fetchedAt` is older than 24 hours, show a small "STATS_STALE — REFRESH AVAILABLE" notice. Don't auto-refetch on the server; the API routes handle that when triggered client-side.

---

## Page layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  DASHBOARD                                           (page header)  │
│  ORBIT_MEMBER_SECTOR_V1 ─────────────────────────────────────────── │
├────────────┬────────────┬────────────┬────────────────────────────┤
│  RANK       │  TOTAL      │  LC_SCORE   │  GITHUB_SCORE              │
│  #3         │  78.4       │  62.1       │  88.2                      │
│  (TactCard) │  (TactCard) │  (TactCard) │  (TactCard)                │
└────────────┴────────────┴────────────┴────────────────────────────┘
┌──────────────────────────┐  ┌────────────────────────────────────┐
│  GITHUB_STATS            │  │  LEETCODE_STATS                    │
│  ─────────────────────── │  │  ──────────────────────────────── │
│  Repos     42            │  │  Total     128                     │
│  Commits   1,204         │  │  Easy      64 / Medium 48 / Hard 16│
│  PRs       37            │  │  Streak    12 days                 │
│  Stars     94            │  │  Ranking   #4,210                  │
│  Top langs: TS, Py, Go   │  │                                    │
│  [bar chart of langs]    │  │  [easy/medium/hard bar]            │
└──────────────────────────┘  └────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│  UPCOMING_EVENTS                                                    │
│  ─────────────────────────────────────────────────────────────────  │
│  [ Event card ]  [ Event card ]  [ Event card ]                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Section specs

### Top stat bar — 4 `TacticalCard` components in a grid

```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
  <TacticalCard id="RANK" ...>
    <span className="text-5xl font-black italic">
      #{leaderboardScore?.rank ?? "—"}
    </span>
  </TacticalCard>
  // repeat for TOTAL_SCORE, LC_SCORE, GITHUB_SCORE
</div>
```

Show `—` for any score that doesn't exist yet (user hasn't been computed in cron yet).

---

### GitHub stats card

Use a `TacticalCard` with `id="GITHUB_STATS"`. Inside:

- Rows for: `REPOS`, `COMMITS`, `MERGED_PRS`, `STARS` — each as a flex row with label + bold value
- Top languages: render as small horizontal bars (use `div` widths proportional to count, no library needed)
- If `githubStats` is null: show `NO_STATS_AVAILABLE — SYNC_PENDING`

```tsx
// Language bar example
<div className="flex items-center gap-3">
  <span className="text-[9px] text-zinc-500 w-16 uppercase">{lang}</span>
  <div className="flex-1 h-1 bg-zinc-900">
    <div className="h-full bg-white" style={{ width: `${pct}%` }} />
  </div>
  <span className="text-[9px] text-zinc-600">{count}</span>
</div>
```

---

### LeetCode stats card

Use a `TacticalCard` with `id="LEETCODE_STATS"`. Inside:

- `TOTAL_SOLVED`, `STREAK`, `RANKING` as label+value rows
- Easy/Medium/Hard as three coloured indicators:
  - Easy: `text-emerald-500`
  - Medium: `text-yellow-500` (only yellow allowed as exception here — it's a well-known convention)
  - Hard: `text-red-500`
- If `lcStats` is null AND `session.user.lcUsername` is null: show `NO_LC_USERNAME — UPDATE_PROFILE`
- If `lcStats` is null but username exists: show `SYNC_PENDING`

---

### Upcoming events

Section header: `UPCOMING_EVENTS`

Three event cards in a grid (`grid-cols-1 md:grid-cols-3`). Each card:
- Use `TacticalCard` with `id="EVT_{index}"`
- Show: event title, date (`eventDate.toLocaleDateString`), location, type badge
- Link the whole card to `/events/{event.id}`
- If no events: `NO_UPCOMING_EVENTS_SCHEDULED`

---

## Null / empty states

Every data section must handle missing data gracefully:

| Scenario | What to show |
|----------|-------------|
| No leaderboard score yet | `RANK: PENDING_COMPUTE` |
| No GitHub stats | `GITHUB_STATS: SYNC_PENDING` |
| No LeetCode stats + no username | `LC_USERNAME_NOT_SET` with a link to profile settings |
| No upcoming events | `NO_UPCOMING_EVENTS_SCHEDULED` |

---

## Imports to use

```ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TacticalCard } from "@/components/ui/TacticalCard";
import { TacticalButton } from "@/components/ui/TacticalButton";
```

No new components needed — everything is available.

---

## What NOT to build here

- Do not add a "refresh stats" button on this page — that belongs on a profile/settings page
- Do not call `/api/stats/github/` or `/api/stats/lc/` from this Server Component — query the DB directly
- Do not show all events — just 3 upcoming ones; full list is on `/events`
- Do not add charts using a chart library — use plain `div` bars as shown above
