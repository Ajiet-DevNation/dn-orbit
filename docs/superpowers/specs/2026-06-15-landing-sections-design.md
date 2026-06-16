# DevNation Orbit — Landing Sections: Events, Leaderboard, Projects, Members

**Date:** 2026-06-15
**Status:** Approved
**Branch:** muaz-polishing-stuff

## Goal

Extend the public landing page (`app/(main)/page.tsx`) with four new full-bleed,
scroll-driven sections that appear after the About terminal, all consistent with
the existing 8-bit / pixel theme. Reorder the nav and add tactile cursor/click
polish.

## Approved decisions

| Decision | Choice |
|---|---|
| Animation engine | Hand-rolled `requestAnimationFrame` driven by scroll position. Matches `AboutTerminal`; survives the global `prefers-reduced-motion` CSS flatten because JS sets inline transforms each frame (the reset only kills CSS `animation`/`transition` durations). |
| `#events` anchor | `AnnouncementCarousel` stays at top as an intro strip, re-anchored off `#events`. The new Events grid owns `id="events"` and is the EVENTS nav target. |
| Data source | Events grid + Leaderboard read **real DB data** (mapped server-side in `page.tsx`, passed as plain serializable props) with 8-bit empty states. Projects + Members use typed boilerplate in `constants/`. |
| Delivery | Section-by-section. Implement → verify (`tsc`, `lint`, dev server) → user review → next task. |

## Shared infrastructure (built once)

1. **`useScrubProgress(ref, { start, end })`** — extract the scroll→progress(0–1)
   + eased rAF loop currently inlined in `AboutTerminal` into a reusable hook.
   Refactor `AboutTerminal` to consume it. Returns a live progress ref + a
   subscribe mechanism so each consumer drives its own inline transforms.
2. **`useRevealStagger`** — rAF helper: when a section enters view, tween each
   child's `opacity`/`transform` in, staggered by index (for the Events grid).
3. **Boilerplate data + types** in `constants/projects.ts` and
   `constants/members.ts` with typed shapes, so real DB wiring later is a
   drop-in replacement.

## Task 1 — Events grid (`EventsSection.tsx`, `id="events"`)

- Placed after `AboutSection`. Renders real published events mapped in `page.tsx`.
- Responsive pixel-card grid (1/2/3 cols). Each 8-bit card: pixelated banner,
  event-type chip, title, `date · location`, description.
- Staggered 8-bit pop-in entrance (scale + pixel-step + fade) via
  `useRevealStagger`.
- 8-bit empty state: "NO EVENTS SCHEDULED".

## Task 2 — Leaderboard (`LeaderboardSection.tsx`, `id="leaderboard"`)

- **Engine hardening first:** review/fix `lib/leaderboard.ts` + `lib/lc-fetcher.ts`
  (normalization edge cases, rank population, empty-data safety). Add a focused
  unit test for scoring/normalization.
- Server read in `page.tsx`: top 20 **visible** users joined to
  `leaderboard_scores` (+ `User.image` avatar), plain props. Graceful
  "leaderboard computing…" state if no scores.
- One tall pinned scroll-scrubbed section via `useScrubProgress`:
  - **Phase A** (progress 0→~0.55): #1 avatar fades in + slow dramatic spin +
    pixel crown top-right → #1 pillar rises → #2 avatar + pillar → #3 avatar +
    pillar. Gold/silver/bronze pixel palette.
  - **Phase B** (~0.55→0.85): podium slides right; top-20 8-bit leaderboard rows
    slide/fade in on the left (rank, avatar, name, score).
- Reduced-motion-safe, no glitches.

## Task 3 — Projects carousel (`ProjectsSection.tsx`, `id="projects"`)

- Boilerplate projects (`constants/projects.ts`).
- Huge 8-bit cards (title top, image fills most of card) in a hand-rolled
  horizontal carousel (reusing the `AnnouncementCarousel` pointer-drag + rAF
  pattern): translates horizontally as you scroll vertically through the pinned
  section (clamped, not to the very end), plus pointer-drag and ◀ ▶ arrow keys.
- Click a card → rest of carousel hides, selected card slides left, right panel
  reveals description + tech-stack chips + GitHub link. Close returns.

## Task 4 — Members carousel (`MembersSection.tsx`, `id="members"`)

- Boilerplate members (`constants/members.ts`).
- Solitaire-proportioned 8-bit cards: role chip top, image (~70% middle), name
  bottom. Same scroll-linked + drag + arrow-key horizontal carousel, stacked.
- Click → card flips (short rAF transform tween, reduced-motion-safe) revealing
  bio + LinkedIn/LeetCode/GitHub links.

## Task 5 — Nav, cursors, click feedback

- Reorder nav to **Events · Leaderboard · Projects · Members** (`V2Header`
  `NAV_TABS` + `constants` `NAV_LINKS`).
- Audit every clickable element → `cursor-pointer`.
- 8-bit press animation on nav tab click: brief rAF transform "thunk"/jitter
  (triggered, reduced-motion-safe).

## Cross-cutting

- New page order after terminal: **Events → Leaderboard → Projects → Members**.
- Server fetches stay in `page.tsx`; client sections receive plain serializable
  props (existing pattern).
- Per-section verification: `bunx tsc --noEmit`, `bun run lint`, dev server;
  leaderboard scoring gets a unit test.
