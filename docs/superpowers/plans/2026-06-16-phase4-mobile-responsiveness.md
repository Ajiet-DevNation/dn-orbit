# Phase 4: Mobile Responsiveness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** Site is usable down to 320px with no horizontal overflow: the coverflow carousels size to the viewport, the admin sidebar becomes an off-canvas drawer, and a global `overflow-x` clamp backstops stray width.

**Architecture:** A small `useViewportWidth` hook drives responsive card/spread/drift values in the Projects & Members sections (SSR-safe: defaults to a desktop width on first render, updates after mount — no hydration mismatch; existing resize listeners re-lay out). The admin layout switches to a fixed sidebar that's a drawer below `md` (new client `AdminSidebar`). A `overflow-x: clip` on `body` prevents any page-level horizontal scroll.

**Out of scope (polish later):** AnnouncementCarousel card width (its marquee math uses module constants; the global clamp already prevents page scroll), fine-grained per-section spacing.

---

### Task 1: Global overflow-x clamp

**Files:** `app/globals.css`

- [ ] In the `body` rule, add `overflow-x: clip;` (clip doesn't create a scroll container, so it won't break `position: sticky`). **Commit** `fix(mobile): clamp horizontal overflow on body`.

---

### Task 2: `useViewportWidth` hook

**Files:** Create `app/(main)/_sections/useViewportWidth.ts`

```ts
"use client";
import { useEffect, useState } from "react";

// SSR-safe viewport width. Returns `defaultWidth` on the server and the first
// client render (so hydration matches), then the real width after mount and on
// resize. Used to size the coverflow carousels responsively.
export function useViewportWidth(defaultWidth = 1280): number {
  const [width, setWidth] = useState(defaultWidth);
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);
  return width;
}
```

- [ ] **Commit** `feat(mobile): add useViewportWidth hook`.

---

### Task 3: Responsive Projects carousel

**Files:** `app/(main)/_sections/ProjectsSection.tsx`

- [ ] Remove module consts `CARD_W = 680`, `CARD_H = 600`, `SPREAD = 400`. Keep them as responsive values inside the component, after the `useScrollParallax` import is added:

```ts
import { useViewportWidth } from "./useViewportWidth";
```

Inside `ProjectsSection`, before `useCoverflow`:

```ts
  const vw = useViewportWidth();
  const CARD_W = Math.min(680, Math.round(vw * 0.86));
  const CARD_H = Math.round(CARD_W * (600 / 680));
  const SPREAD = Math.round(CARD_W * (400 / 680));
  const DRIFT = vw < 768 ? Math.round(vw * 0.15) : 260;
```

- [ ] `useCoverflow({ count: PROJECTS.length, spread: SPREAD, ... })` (already reads SPREAD) and `useScrollParallax(sectionRef, stageRef, { maxPx: DRIFT, direction: -1, tau: 90 })`.
- [ ] The card wrapper already uses `CARD_W`/`CARD_H`/`marginLeft`/`marginTop` — now responsive. The detail FLIP card `style={{ width: CARD_W, height: CARD_H }}` becomes responsive too. The detail overlay grid (`flex ... gap-8 lg:gap-16`) already stacks acceptably; add `flex-col lg:flex-row` so the detail panel sits below the card on small screens.
- [ ] `bunx tsc --noEmit`. **Commit** `feat(mobile): responsive Projects carousel sizing + drift`.

---

### Task 4: Responsive Members carousel

**Files:** `app/(main)/_sections/MembersSection.tsx`

- [ ] Remove module consts `CARD_W = 392`, `CARD_H = 536`, `SPREAD = 224`. Add inside component:

```ts
import { useViewportWidth } from "./useViewportWidth";
// ...
  const vw = useViewportWidth();
  const CARD_W = Math.min(392, Math.round(vw * 0.82));
  const CARD_H = Math.round(CARD_W * (536 / 392));
  const SPREAD = Math.round(CARD_W * (224 / 392));
  const DRIFT = vw < 768 ? Math.round(vw * 0.15) : 260;
```

- [ ] `useScrollParallax(sectionRef, stageRef, { maxPx: DRIFT, direction: 1, tau: 90 })`. Card wrapper uses the responsive consts (already). `bunx tsc --noEmit`. **Commit** `feat(mobile): responsive Members carousel sizing + drift`.

---

### Task 5: Admin off-canvas sidebar

**Files:** Create `components/layout/AdminSidebar.tsx`; modify `app/admin/layout.tsx`

- [ ] **Step 1: client AdminSidebar** — fixed sidebar that's always visible on `md+` and a togglable drawer below `md` (hamburger + backdrop). Owns `navItems` (icons are client-only, can't be passed from the server layout). Renders a shared inner (brand + nav + session/sign-out).

```tsx
// components/layout/AdminSidebar.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users, Calendar, Settings, LayoutDashboard, LogOut, Trophy, Rocket,
  UserCheck, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { SidebarBrand } from "@/components/layout/SidebarBrand";

const navItems = [
  { label: "OVERVIEW", href: "/admin", icon: LayoutDashboard },
  { label: "MEMBERS", href: "/admin/members", icon: Users },
  { label: "REQUESTS", href: "/admin/requests", icon: UserCheck },
  { label: "EVENTS", href: "/admin/events", icon: Calendar },
  { label: "PROJECTS", href: "/admin/projects", icon: Rocket },
  { label: "LEADERBOARD", href: "/admin/leaderboard", icon: Trophy },
  { label: "SETTINGS", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar({ userName }: { userName: string | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open admin menu"
        className="retro fixed left-3 top-3 z-50 flex items-center gap-2 border-2 border-[#22c55e]/40 bg-black px-3 py-2 text-[9px] text-[#22c55e] md:hidden"
      >
        <Menu className="h-4 w-4" /> MENU
      </button>

      {/* Backdrop (mobile, when open) */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar: fixed drawer on mobile, fixed rail on desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-col border-r-2 border-white/10 bg-black transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between md:block">
          <SidebarBrand sectorLabel="COMMAND_SEC_V4" />
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="retro mr-4 text-[#22c55e] md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-6">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "retro group flex items-center gap-4 border-2 px-4 py-3 text-[9px] tracking-widest transition-all",
                  active
                    ? "border-[#22c55e]/40 bg-[#22c55e]/[0.08] text-[#22c55e]"
                    : "border-transparent text-zinc-500 hover:border-[#22c55e]/30 hover:bg-[#22c55e]/[0.06] hover:text-[#22c55e]"
                )}
              >
                <item.icon className="h-4 w-4 opacity-40 transition-all group-hover:opacity-100 group-hover:text-[#22c55e]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-4 border-t-2 border-white/10 bg-[#22c55e]/[0.03] p-6">
          <div className="border-2 border-[#22c55e]/20 bg-[#22c55e]/[0.06] px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="retro text-[7px] tracking-[0.2em] text-[#22c55e]/60">ADM_SESSION</span>
              <div className="h-1 w-1 animate-pulse bg-[#22c55e]" />
            </div>
            <div className="retro truncate text-[9px] uppercase tracking-tighter text-[#22c55e]">
              {userName || "COMMANDER"}
            </div>
          </div>
          <SignOutButton className="retro flex w-full items-center justify-center gap-3 border-2 border-white/20 bg-transparent px-4 py-3 text-[8px] uppercase tracking-[0.3em] text-zinc-500 transition-all hover:border-[#22c55e] hover:bg-[#22c55e] hover:text-black">
            <LogOut className="h-3 w-3" /> TERMINATE
          </SignOutButton>
        </div>
      </aside>
    </>
  );
}
```

- [ ] **Step 2: layout** — `app/admin/layout.tsx` drops the inline `<aside>` and its lucide imports, renders `<AdminSidebar userName={session?.user?.name ?? null} />`, and offsets main with `md:ml-72`:

```tsx
  return (
    <div className="min-h-screen bg-black font-mono text-white">
      <AdminSidebar userName={session?.user?.name ?? null} />
      <main className="dot-grid-bg relative min-h-screen md:ml-72">
        <div className="pointer-events-none absolute inset-0 bg-black/60" />
        <div className="relative z-10 h-full w-full overflow-y-auto pt-14 md:pt-0">
          {children}
        </div>
      </main>
    </div>
  );
```

(The `pt-14 md:pt-0` clears the floating mobile hamburger.) Keep the `canAccessAdmin` redirect.

- [ ] `bunx tsc --noEmit` + `bun run lint`. **Commit** `feat(mobile): admin off-canvas sidebar drawer`.

---

### Task 6: ProfileModal + small grid tweaks

**Files:** `app/(main)/_sections/ProfileModal.tsx`

- [ ] Reduce modal padding on mobile: `p-12` → `p-6 md:p-12`; the two `grid grid-cols-2 gap-5` field rows → `grid grid-cols-1 sm:grid-cols-2 gap-5` so USN/LEETCODE and BRANCH/YEAR stack on the narrowest screens. `bunx tsc --noEmit`. **Commit** `feat(mobile): responsive profile modal`.

---

### Task 7: Verify

- [ ] `bun test lib`, `bunx tsc --noEmit`, `bun run lint` clean.
- [ ] Build/render smoke: `/` renders 200.
- [ ] Manual (developer, real device/devtools at 320/375/768): no horizontal scroll; Projects/Members cards fit and swipe; admin sidebar opens via hamburger and links navigate + close it; profile modal fits.

---

## Self-Review

- **Spec coverage:** carousels responsive (T3–T4), admin sidebar drawer (T5), global overflow clamp (T1), profile modal (T6), touch targets (nav links py-3, buttons ≥ 40px). AnnouncementCarousel width explicitly deferred. Covered for the breakages.
- **Hydration:** `useViewportWidth` returns the same default on server + first client render → no mismatch; sizes update post-mount.
- **Sticky safety:** `overflow-x: clip` (not `hidden`) on body preserves sticky header/sidebar.
