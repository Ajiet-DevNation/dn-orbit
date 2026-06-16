# ORBIT Polish Finale — Design

**Date:** 2026-06-16
**Branch:** `muaz-polishing-finale`
**Status:** Approved — ready for implementation planning

## Overview

Five independent workstreams to bring the dn-orbit landing site and admin panel to
production quality: remove scroll-jacking, introduce a tiered RBAC model with an
8-bit admin theme, add a membership approval queue, make the whole site responsive
to 320px, and lock in 60fps performance.

Delivered as **five sequential phases on a single branch** (`muaz-polishing-finale`),
with a review checkpoint after each phase. The Prisma migration and seed require a
live database; the author writes the SQL/seed and exact commands, and the developer
runs them (no DB access from the implementation environment).

### Stack context (verified)

- Next.js 16 (App Router), React 19, TypeScript strict.
- Edge **`proxy.ts`** replaces `middleware.ts` (Next 16); it gates routes via
  `getToken()` (JWT), reading `token.role`.
- `lib/auth.ts` — NextAuth v5, GitHub-only, JWT sessions, Prisma adapter,
  `signIn`/`jwt`/`session` callbacks, `createUser`, allowlist gate.
- Theme: the public site opts into pixel styling via the `[data-v2]` wrapper, which
  reverses the global `* { border-radius: 0 !important }` reset and enables `.retro`
  pixel font + `.pixelated`. `app/admin/*` is **not** wrapped — it uses a separate
  "Tactical" theme (`TacticalTable`, `TacticalButton`, etc.).
- `globals.css` flattens all CSS `animation`/`transition` durations under
  `prefers-reduced-motion`, so essential motion must be JS/rAF-driven.

---

## Phase 1 — Remove scroll-jacking, add non-blocking parallax

### Current state

`ProjectsSection` (`height: 340vh`) and `MembersSection` (`height: 320vh`) each render
a tall spacer with a `sticky top-0 h-screen` inner stage. `useCoverflow` converts the
scroll offset through that tall region into horizontal coverflow focus — pinning the
viewport for 3+ screen-heights. This is the scroll-jacking to remove. Other sections
(`AboutTerminal`, leaderboard podium, `V2Header`) use the same `useScrubProgress`
pinning but are **out of scope** (task scoped to Projects & Members only).

### Target

Sections become normal-flow (~one viewport tall, height `auto`); vertical scroll is
never intercepted. Two single-purpose motion units:

- **`useCoverflow` (refactored, free-running):** focus driven only by drag/swipe +
  arrow keys + click-to-centre. The scroll→focus coupling (`scrollFocus`,
  `scrubStart`/`scrubEnd`, the scroll/resize `setTarget` listener) is removed.
  All existing interactions are preserved: FLIP expand-to-detail (Projects), 3D
  flip (Members), click-to-centre, keyboard arrows, drag-to-snap.
- **New `useScrollParallax(ref)`:** returns an eased −1…1 value of how far the
  section has travelled through the viewport (rAF, passive `scroll`/`resize`). The
  section maps it to a subtle `translateX` drift (≈ ±40px) on the card stage,
  clamped and eased. Gated off under `prefers-reduced-motion`.

### Files

- `app/(main)/_sections/useCoverflow.ts` — remove scroll coupling.
- `app/(main)/_sections/useScrollParallax.ts` — new.
- `app/(main)/_sections/ProjectsSection.tsx`, `MembersSection.tsx` — drop pinned
  heights/`sticky`, normal flow, apply parallax drift to stage.

### Testing

- Vertical scroll passes through both sections with no pin/lock.
- Drag/swipe/arrows/click-to-expand all still work.
- Parallax drift visible on scroll; absent under reduced-motion.

---

## Phase 2 — RBAC tiers + admin theme alignment

### Role model (expand the enum)

`enum Role { president, vice_president, core_member, member }`.
Migration maps existing `admin → president`, `member → member` (Postgres enum swap:
create new enum, `ALTER COLUMN ... USING`, drop old). Written by hand; run by developer.

### Single source of truth — `lib/roles.ts` (pure, edge-safe, no DB import)

- `ADMIN_ROLES = ["president", "vice_president", "core_member"]`
- `canAccessAdmin(role)` — `member` excluded. Gates `/admin` (proxy + layout) and
  **every** admin API route (replaces all ~24 `role === "admin"` checks).
- `canManageRoles(role)` → `role === "president"`. Gates the role-tier change UI
  **and** the server mutation.

### Auth wiring (`lib/auth.ts`)

- TS module augmentation: `role` union becomes the 4-tier type.
- `jwt`/`session` callbacks propagate the new role (and Phase 3 `status`).
- `ADMIN_GITHUB_USERNAMES` bootstrap grants `president` (guarantees a president
  exists to manage roles), keeps it elevated in the `jwt` callback as today.

### Enforcement points

- `proxy.ts` — admin gate uses `canAccessAdmin(token.role)`.
- `app/admin/layout.tsx` — `canAccessAdmin(session.user.role)` else `redirect("/")`.
- All `app/api/admin/**` routes and admin server actions — `canAccessAdmin`.
- `PATCH /api/admin/members/[id]` — role-tier change requires `canManageRoles`
  (403 otherwise); validate new role ∈ enum; guard a president from stripping their
  own role (lockout prevention).
- `app/(main)/page.tsx` / other `role === "admin"` reads updated to the helper.

### MemberTable UI

Admin/member toggle → a 4-tier `<select>`, **enabled only for President**; other
admins see the role read-only. Self-role-change guard retained.

### Seed Muaz

`prisma/seed.ts` (idempotent upsert) sets GitHub login `MuazTPM-YT` →
`role: president`, `status: approved`. Run via `bunx prisma db seed`.
> Note: design called for Core Member; set to **President for testing** per request —
> flip to `core_member` later by changing one line.

### Admin theme (8-bit alignment)

Wrap `app/admin/layout.tsx` subtree in `[data-v2]`; restyle admin to the public
8-bit theme — swap `Tactical*` for `8bit-*` (card/button/input/select/tabs/drawer),
`.retro` font, green `#22c55e` accent, dot-grid background, pixel-framed sidebar.
Structure/IA unchanged. Covers `app/admin/**` pages + the `Tactical*` components.

### Files

`prisma/schema.prisma`, new migration, `prisma/seed.ts`, `lib/roles.ts`,
`lib/auth.ts`, `proxy.ts`, `app/admin/layout.tsx`, `app/admin/**`,
`app/api/admin/**`, `app/api/**` admin-guarded routes,
`app/admin/members/MemberTable.tsx`, `app/api/admin/members/[id]/route.ts`,
`components/ui/Tactical*` (restyle/replace), `app/(main)/page.tsx`, `.env.example`.

### Testing

- A `member` is redirected from `/admin` and gets 403 from admin APIs (proxy + layout
  + route, all three layers).
- Core Member / VP can open the panel; only President sees an enabled role selector.
- Non-president PATCH with `role` → 403.
- Existing admins become President after migration; Muaz seed grants President.

---

## Phase 3 — Membership approval queue

### Model

`enum ApprovalStatus { pending, approved, rejected }`; `User.status` default `pending`.
Migration sets all **existing** users → `approved` (no current member locked out).
`createUser` sets new users → `pending` (bootstrap users → `approved`).

### Double-gate sign-in (`lib/auth.ts`)

1. **Allowlist gate (unchanged):** `isAllowedToSignIn` still controls whether a
   GitHub user may sign in at all.
2. **Status gate (new):** the `signIn` callback also denies any existing user whose
   `status === "rejected"` (they bounce to `/login?error=AccessDenied`). Pending and
   approved users may sign in.

`status` is carried in the `jwt` + `session` callbacks so server components, proxy,
and APIs can read it.

### Pending UX — browse read-only, hidden from others

Pending users stay signed in and may browse, but:

- **Excluded from DB-driven listings:** leaderboard query adds `status: "approved"`
  (alongside `isVisible`); any other DB-driven member listing filters the same way.
  (The public Members carousel reads curated `constants/members.ts`, not the DB — so
  it is unaffected by design.)
- **Blocked from member write actions (403):** event registration
  (`/api/events/[id]/register`), feedback (`/api/events/[id]/feedback`), project
  submission (`/api/projects`), project membership — all require
  `status === "approved"`. Centralised via a small `requireApproved` check.
- A subtle "pending approval" banner explains the state.

### Reject behaviour

Reject sets `status = "rejected"` → can no longer sign in (status gate above), but
the public landing remains browsable anonymously like any visitor. Reversible by an
admin (set back to approved/pending). Record retained for audit.

### Access Requests admin tab

New tab `app/admin/requests/` listing users with `status = pending` (with filter for
rejected/all), showing name / email / **USN** / branch / year / GitHub username so
reviewers can spot fake-college USNs. Approve / Reject actions.

- **Authorization:** `canAccessAdmin` (President / VP / Core Member) — approval is
  open to all admin roles; **only role-tier changes remain President-only**. `member`
  never reaches it.
- **API:** `PATCH /api/admin/members/[id]` extended to accept `status` (guarded by
  `canAccessAdmin`), or a dedicated `app/api/admin/requests/[id]/route.ts`. Validate
  `status ∈ enum`.

### Files

`prisma/schema.prisma` + migration, `lib/auth.ts`, `lib/roles.ts` (or a small
`lib/access.ts` for `requireApproved`), `proxy.ts` (status passthrough only),
`app/admin/requests/**` (new), admin nav in `app/admin/layout.tsx`,
`app/api/admin/members/[id]/route.ts` (or new requests route),
`app/api/events/[id]/register/route.ts`, `app/api/events/[id]/feedback/route.ts`,
`app/api/projects/route.ts`, `app/api/projects/[id]/members/route.ts`,
leaderboard query in `app/(main)/page.tsx`, a pending-banner component.

### Testing

- New allowlisted sign-in → `pending`; appears in Access Requests; cannot register
  for events / submit projects (403); absent from leaderboard.
- Approve → gains member write access and appears in DB listings.
- Reject → cannot sign in again; public browsing still works.
- Existing users unaffected (migrated to approved).
- `member`-role user cannot reach the Requests tab or its API.

---

## Phase 4 — Mobile responsiveness (to 320px)

- **Carousels:** replace fixed `CARD_W`/`CARD_H`/`SPREAD` px with `clamp()`-based
  responsive sizing fed into `useCoverflow`; recompute on resize (listener exists).
  Touch swipe already works (pointer events + `touch-pan-y`). Eliminate horizontal
  overflow.
- **Admin:** fixed `w-72` sidebar → off-canvas drawer (reuse `8bit-drawer`/vaul)
  behind a hamburger ≤ md; wide tables get horizontal-scroll containers or stack into
  cards on small screens.
- **Global sweep:** responsive headings/body text, multi-col grids collapse to one
  column, `V2Header` mobile menu, `overflow-x` clamp on `body`. Audited at
  320 / 375 / 768.
- Touch targets ≥ 44px.

### Testing

- No horizontal scroll/clipping at 320/375/768 on landing + admin.
- Carousels swipeable; admin nav reachable via drawer on mobile.

---

## Phase 5 — Performance & thermal mitigation

Phase 1 already removes the dominant cost (3+ screens of pinned compositing). On top:

- **`will-change` discipline:** apply `will-change: transform` only during active
  animation (toggle in the rAF loop) and remove at rest — no permanent promotion.
- **Layout-property audit:** ensure all animation uses `transform`/`opacity` only,
  never `top/left/margin/height` over time. (Detail panels already use `translateX`.)
- **Listeners/throttle:** keep passive listeners + rAF coalescing (already present).
- **Renders:** memoize expensive computations; keep per-frame transforms imperative
  (already the pattern).
- **Reduced motion:** gate all autonomous/drift motion (incl. Phase 1 parallax)
  behind `prefers-reduced-motion`.

### Testing

- Production build; manual DevTools FPS/perf check on landing scroll and carousels;
  target sustained ~60fps with no long-task jank; no permanent `will-change` layers.

---

## Cross-cutting risks

- **Prisma enum migrations on Postgres/Neon** need care (cannot trivially drop enum
  values in one step) — migration written as explicit SQL, run by the developer with
  `DATABASE_URL`/`DIRECT_URL`.
- **Two new enums + status defaults** must migrate existing rows safely (existing
  users → `approved`, existing admins → `president`) to avoid lockout.
- **Edge safety:** role/status predicates live in DB-free modules so `proxy.ts`
  (Edge runtime) can import them.
- TypeScript strict — no `any`; update all module augmentations and Prisma-derived
  types together so the build stays green.

## Out of scope

- Pinned scrub effects on `AboutTerminal`, leaderboard podium, `V2Header`.
- Email notifications on approval/rejection.
- Any change to the leaderboard scoring formula or stats fetching.
