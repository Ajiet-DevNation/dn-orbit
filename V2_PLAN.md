# ORBIT V2 — 8-bit Dashboard Revamp Plan

## Overview

Full UI revamp of the member dashboard with an 8-bit retro game theme.
Lives at `/v2` as a **single scrollable page** — all sections on one route.
Built with components from [21st.dev](https://21st.dev) (no custom components from scratch).
Existing v1 dashboard at `/dashboard` is **untouched**.

**Tech stack:** Next.js 16 App Router · React 19 · Tailwind CSS v4 · Press Start 2P font · 21st.dev 8bit components

---

## Page Layout

```
┌────────────────────────────────────────────────────┐
│  [DN Logo] ORBIT   [EVENTS][LB][MEMBERS][PROJECTS]   [Avatar]  │  ← sticky header
├────────────────────────────────────────────────────┤
│  ← Announcement carousel (auto-scroll) →           │
├────────────────────────────────────────────────────┤
│  [Personal Stats]   [NP][NE][CS]   [# Rank]        │
├────────────────────────────────────────────────────┤
│  About section                                     │
└────────────────────────────────────────────────────┘
```

Nav tabs: **EVENTS** · **LB** (Leaderboard) · **MEMBERS** · **PROJECTS**
Action buttons: **NP** = New Project → `/projects/new` · **NE** = New Event → `/events` · **CS** = Contact Support

---

## File Structure

```
app/
  v2/
    layout.tsx          ← auth guard + Press Start 2P scoped + ASCII bg + dark class
    page.tsx            ← Server Component, fetches all DB data, assembles sections
    _sections/
      V2Header.tsx      ← sticky nav header (client)
      AnnouncementCarousel.tsx
      StatsSection.tsx
      AboutSection.tsx
components/
  v2/
    AsciiBackground.tsx ← animated ASCII dots canvas (no mouse effect)
```

---

## Critical Notes (Lessons Learned)

| Issue | Fix Applied |
|-------|-------------|
| `shadcn init` overwrote `--font-heading` to `var(--font-sans)` | Restored to `var(--font-bebas-neue)` in globals.css |
| `shadcn init` added `@layer base` that bled into v1 | Removed that block, replaced with scoped v2 rules |
| `border-radius: 0 !important` global reset breaks 8bit components | `[data-v2] * { border-radius: revert !important }` |
| `next/font/google` exposes font via CSS variable, not raw name | `.retro` uses `var(--font-pixel), "Press Start 2P"` |
| `border-y-6` / `border-x-6` in Tailwind v4 = 24px (spacing scale × 6), not 6px | CSS fix: `[data-v2] [data-slot="tabs-list"] > div[aria-hidden] { border-width: 6px }` |
| Root layout has `DotGridBackground` fixed at z-0 | v2 `AsciiBackground` at z-1 covers it |
| Logo file is `DevNationLogo.png` (not `DevNationLogoFinale.png`) | Confirmed |
| `Date` objects from Prisma can't cross Server→Client boundary | Serialize with `.toISOString()` |

---

## Components to Install (21st.dev)

```bash
# Already installed ✅
bunx shadcn@latest add "https://21st.dev/r/ui-layouts/delicate-ascii-dots"
bunx shadcn@latest add "https://21st.dev/r/theorcdev/8bit-tabs"
bunx shadcn@latest add "https://21st.dev/r/theorcdev/8bit-avatar"

# To install when starting Step 3
bunx shadcn@latest add "https://21st.dev/r/OrcDev/8bit-carousel"

# To install when starting Step 4
bunx shadcn@latest add "https://21st.dev/r/OrcDev/8bit-mana-bar"
bunx shadcn@latest add "https://21st.dev/r/theorcdev/8bit-xp-bar"
bunx shadcn@latest add "https://21st.dev/r/OrcDev/8bit-enemy-health-display"
bunx shadcn@latest add "https://21st.dev/r/theorcdev/8bit-button"

# Utilities (install when needed)
bunx shadcn@latest add "https://21st.dev/r/theorcdev/8bit-toast"
bunx shadcn@latest add "https://21st.dev/r/OrcDev/8bit-loading-screen"
```

---

## Build Steps

### Step 1 — Layout Shell + Background

- [x] Install ASCII dots component (`components/ui/delicate-ascii-dots.tsx`)
- [x] Create `components/v2/AsciiBackground.tsx` — no mouse effects, full-screen canvas, opacity ~25%, dark bg `#0a0a0a`
- [x] Create `app/v2/layout.tsx` — Press Start 2P font scoped to `--font-pixel`, `data-v2` wrapper, `dark` class for shadcn components, auth guard
- [x] Create `app/v2/page.tsx` — skeleton placeholder "ORBIT V2"
- [x] Fix `globals.css` regressions from `shadcn init` (restore `--font-heading`, remove bleeding `@layer base`)
- [x] Add `[data-v2] * { border-radius: revert !important }` to globals.css
- [x] Add scoped `.retro` font fix using `var(--font-pixel)` to globals.css
- [x] Add Tailwind v4 border-width fix for 8bit-tabs to globals.css

---

### Step 2 — Header

- [x] Install `8bit-tabs` and `8bit-avatar`
- [x] Create `app/v2/_sections/V2Header.tsx` (client component)
- [x] DevNation logo (`/assets/DevNationLogo.png`, inverted) + "ORBIT" in pixel font (left)
- [x] `8bit-tabs` nav — EVENTS / LB / MEMBERS / PROJECTS in center; `onClick` smooth-scrolls to `#events`, `#leaderboard`, `#members`, `#projects`
- [x] Tabs visual confirmed working — chunky pixel box border visible, active tab highlighted (green = brand accent), Press Start 2P font rendering
- [x] `8bit-avatar` (pixel octagon frame) with session user photo on right, 64px size
- [x] Avatar pixel frame confirmed rendering correctly (octagon shape around photo)
- [x] Header is sticky (`sticky top-0 z-50`)

---

### Step 3 — Announcement Carousel

- [x] Install `8bit-carousel` (also pulled in `8bit-card` + `8bit-button` as deps)
- [x] Create `app/v2/_sections/AnnouncementCarousel.tsx` (client component)
- [x] Fetch real events in `page.tsx`: `db.event.findMany({ where: { isPublished: true }, orderBy: { eventDate: "asc" }, take: 6 })`
- [x] Serialize dates: pass `eventDate: event.eventDate.toISOString()` to client
- [x] Wrap 8bit-carousel with `useEffect` auto-advance every 4s (loop enabled)
- [x] Pause auto-scroll on hover
- [x] Each card shows: event-type chip, title, formatted date, description, location
- [x] Apply same `border-t/b-[6px]` Tailwind-v4 fix to `8bit-card.tsx` (border-y-6 quirk)
- [x] Fallback: 3 hardcoded mock cards if events array is empty
- [x] Add `id="events"` anchor to this section
- [ ] Visual confirmed on a real screen with auto-advance + hover-pause working
- [ ] Removed `--radius: var(----radius)` line shadcn re-injected into globals.css (done)

---

### Step 4 — Stats Section

- [x] Install `8bit-mana-bar`, `8bit-enemy-health-display` (+ deps `8bit-progress`, `8bit-health-bar`); `8bit-button` already present
- [x] NOTE: `8bit-xp-bar` installed as a broken minified bundle (strict-TS errors) → deleted; both bars driven via shared `Progress` (8bit-progress) with blue/yellow colors instead
- [x] Create `app/v2/_sections/StatsSection.tsx` (client component)
- [x] Add DB queries to `page.tsx` (findFirst for stats, findUnique for leaderboardScore; guarded on userId)
- [x] **Left column — Personal Stats:**
  - [x] Blue segmented bar for GitHub commits (normalised /1000)
  - [x] Yellow segmented bar for LeetCode total solved (normalised /500)
  - [x] Show "NO STATS CACHED YET" + zero bars when no stats
- [x] **Center column — Action Buttons:**
  - [x] `8bit-button`: NEW PROJECT → `/projects/new` (router.push)
  - [x] `8bit-button`: NEW EVENT → `/events`
  - [x] `8bit-button`: CONTACT → `mailto:devnation@ajiet.edu.in` (PLACEHOLDER — confirm dest)
- [x] **Right column — Rank:**
  - [x] Large pixel-font `#N` + green SCORE bar (enemy-health-display's color prop is hardcoded red → used `Progress` for consistency)
  - [x] Show `leaderboardScore.rank` and `leaderboardScore.totalScore`
  - [x] Fallback: "—" / "UNRANKED" if no score yet
- [x] Three-column grid layout matching sketch
- [x] EXPANDED to match v1 data richness (per user): full GitHub panel (repos/commits/merged_prs/stars/top_languages/date_stamp) + LeetCode panel (total_solved/streak/ranking/easy-medium-hard tiles/date_stamp)
- [x] STATS_CONTROL bar with cache status + RANK/SCORE line + `↻ REFRESH_STATS` button
- [x] Refresh calls existing v1 endpoints `GET /api/stats/github/[userId]` + `/api/stats/lc/[userId]` (re-fetch when 24h cache stale), updates local state + `router.refresh()`
- [x] Install `8bit-toast` — NOTE: ships as broken minified bundle; added `// @ts-nocheck` + `"use client"`; its exported `toast(title)` is SINGLE-ARG (no `.success`/`.error`) → call `toast("✓ ...")` / `toast("✗ ...")`. `<Toaster/>` mounted in v2 layout.
- [ ] Visual confirmed on a real signed-in screen: live data, refresh round-trip, toast appears (headless can't render sonner transitions)
- [ ] CONTACT mailto destination still a placeholder (`devnation@ajiet.edu.in`)

---

### Step 5 — About Section

- [ ] Design discussion needed with user before building
- [ ] Placeholder: `id="members"` and `id="leaderboard"` and `id="projects"` anchors to be added somewhere (even if empty sections) so header tab scroll works

---

### Step 6 — Full Page Assembly

- [ ] Update `app/v2/page.tsx` to fetch all data and pass to sections
- [ ] Add section anchor IDs: `id="events"`, `id="leaderboard"`, `id="members"`, `id="projects"`
- [ ] Assemble all sections in scroll order: Header → Carousel → Stats → About
- [ ] Consider parallax dividers between sections (decide with user)
- [ ] Test smooth-scroll from header tabs to each section

---

## Data Serialization Contract

All DB data fetched in `app/v2/page.tsx` (Server Component). Raw `Date` objects serialized before passing to client components:

```ts
// AnnouncementCarousel props
type EventCard = {
  id: string
  title: string
  eventDate: string        // .toISOString()
  eventType: string | null
  location: string | null
}

// StatsSection props
type StatsProps = {
  githubStats: { totalCommits: number; totalPrs: number; totalStars: number } | null
  lcStats: { totalSolved: number; easySolved: number; mediumSolved: number; hardSolved: number } | null
  leaderboardScore: { rank: number | null; totalScore: number } | null
}
```

---

## Verification Checklist (run after each step)

```bash
bun run lint && bunx tsc --noEmit
```

Then open `http://localhost:3000/v2` and verify visually.

- [ ] No TypeScript errors
- [ ] No ESLint errors (warnings in installed 21st.dev files are acceptable)
- [ ] Background ASCII animation visible at ~25% opacity
- [ ] Header sticky, pixel font rendering, tab box visible with borders
- [ ] Avatar shows photo in pixel octagon frame
- [ ] Carousel auto-scrolling with event cards
- [ ] Stats bars showing real data (or zero-state if no cache)
- [ ] Action buttons navigate correctly
- [ ] Rank displays
- [ ] Header tab clicks smooth-scroll to correct section
- [ ] v1 pages (`/dashboard`, `/events`, etc.) completely unaffected

---

## Decisions Still Open

- [ ] Contact support destination for CS button (mailto? form? Discord?)
- [ ] About section design (needs discussion)
- [ ] Parallax effects between sections (still work in progress per user)
- [ ] Whether to add 8bit-toast for action feedback
- [ ] Migration from `/v2` to main routes once approved
