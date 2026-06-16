# Phase 1: Remove Scroll-Jacking + Non-Blocking Parallax — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the pinned/scroll-jacked layout from the Projects and Members carousels so vertical scrolling is never intercepted, and add a subtle scroll-linked horizontal parallax drift instead.

**Architecture:** Split the two responsibilities the old `useCoverflow` conflated. `useCoverflow` keeps *browsing* (drag/swipe/keys/click) but loses its scroll→focus coupling. A new pure helper `lib/parallax.ts` computes a signed −1…1 viewport progress, and a new `useScrollParallax` hook eases that value in a rAF loop and writes a small `translateX` directly to the card-stage element (imperative, no React re-renders). The sections become normal-flow (`min-h-screen`, no `sticky`, no multi-screen spacer height).

**Tech Stack:** Next.js 16 / React 19, TypeScript strict, `bun test` for the pure helper, rAF + passive listeners for motion.

---

## File Structure

- **Create** `lib/parallax.ts` — pure `viewportProgress()` math (testable, no DOM).
- **Create** `lib/parallax.test.ts` — unit tests for `viewportProgress()`.
- **Create** `app/(main)/_sections/useScrollParallax.ts` — rAF hook; writes `translateX` to a stage ref; gated by `prefers-reduced-motion`.
- **Modify** `app/(main)/_sections/useCoverflow.ts` — remove scroll→focus coupling (`scrollFocus`, `scrubStart`, `scrubEnd`, scroll listener); focus driven only by `manualRef`.
- **Modify** `app/(main)/_sections/ProjectsSection.tsx` — drop `SECTION_VH`/`sticky`; normal flow; add stage ref + parallax.
- **Modify** `app/(main)/_sections/MembersSection.tsx` — same.

---

### Task 1: Pure parallax math (`lib/parallax.ts`) — TDD

**Files:**
- Create: `lib/parallax.ts`
- Test: `lib/parallax.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/parallax.test.ts
import { test, expect } from "bun:test";
import { viewportProgress } from "./parallax";

// viewportProgress(rectTop, rectHeight, viewportHeight) -> signed -1..1.
// -1 when the element sits fully below the viewport, 0 when its centre is at the
// viewport centre, +1 when it has fully passed above. The travel range spans
// (viewportHeight + rectHeight)/2 so 0 lands exactly at centre.

test("centred element returns ~0", () => {
  // element height 400 in a 1000 viewport: centred when top = 300 (centre 500).
  expect(viewportProgress(300, 400, 1000)).toBeCloseTo(0, 5);
});

test("element fully below viewport returns -1", () => {
  // top at viewportHeight (1000) → just entering from bottom → -1.
  expect(viewportProgress(1000, 400, 1000)).toBeCloseTo(-1, 5);
});

test("element fully above viewport returns +1", () => {
  // top = -rectHeight (-400) → just left at top → +1.
  expect(viewportProgress(-400, 400, 1000)).toBeCloseTo(1, 5);
});

test("clamps beyond the travel range", () => {
  expect(viewportProgress(5000, 400, 1000)).toBe(-1);
  expect(viewportProgress(-5000, 400, 1000)).toBe(1);
});

test("guards a zero-size viewport (no NaN)", () => {
  expect(viewportProgress(0, 0, 0)).toBe(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/parallax.test.ts`
Expected: FAIL — `Cannot find module './parallax'` / `viewportProgress is not a function`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/parallax.ts
// Pure, DOM-free parallax math so it can be unit-tested with `bun test` and
// reused by the rAF hook. Returns a signed progress value:
//   -1  element just entering from the bottom of the viewport
//    0  element centre aligned with viewport centre
//   +1  element just leaving past the top
// Travel range = (viewportHeight + rectHeight) / 2 so 0 is exactly centre.

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

export function viewportProgress(
  rectTop: number,
  rectHeight: number,
  viewportHeight: number
): number {
  const range = (viewportHeight + rectHeight) / 2;
  if (range <= 0) return 0;
  const elementCentre = rectTop + rectHeight / 2;
  const viewportCentre = viewportHeight / 2;
  return clamp((viewportCentre - elementCentre) / range, -1, 1);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/parallax.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/parallax.ts lib/parallax.test.ts
git commit -m "feat(scroll): add pure viewportProgress parallax helper"
```

---

### Task 2: `useScrollParallax` hook

**Files:**
- Create: `app/(main)/_sections/useScrollParallax.ts`

This hook is DOM/rAF-bound (not unit-testable with the current runner); it is verified manually in Tasks 4–5. It reuses the tested `viewportProgress` for the math.

- [ ] **Step 1: Write the hook**

```ts
// app/(main)/_sections/useScrollParallax.ts
"use client";

import { useEffect } from "react";
import { viewportProgress } from "@/lib/parallax";

// Subtle, non-blocking horizontal drift keyed to scroll position. Writes a
// translateX straight to `stageRef` (imperative — no per-frame React renders,
// matching useCoverflow). Eased in a self-stopping rAF loop so coarse wheel
// deltas don't jump. Disabled under prefers-reduced-motion (the global CSS reset
// flattens CSS motion; this JS motion is autonomous-ish, so we suppress it).

const TAU_MS = 120;
const MAX_DT_MS = 50;

export function useScrollParallax(
  sectionRef: React.RefObject<HTMLElement | null>,
  stageRef: React.RefObject<HTMLElement | null>,
  maxPx = 40
): void {
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      if (stageRef.current) stageRef.current.style.transform = "";
      return;
    }

    let target = 0;
    let displayed = 0;
    let running = false;
    let raf = 0;
    let last = 0;
    let scrollFrame = 0;

    const apply = () => {
      const el = stageRef.current;
      if (el) el.style.transform = `translate3d(${displayed * maxPx}px,0,0)`;
    };

    const wake = () => {
      if (running) return;
      running = true;
      last = performance.now();
      const step = (now: number) => {
        const dt = Math.min(now - last, MAX_DT_MS);
        last = now;
        const diff = target - displayed;
        if (Math.abs(diff) < 0.0005) {
          displayed = target;
          apply();
          running = false;
          return;
        }
        displayed += diff * (1 - Math.exp(-dt / TAU_MS));
        apply();
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const measure = () => {
      scrollFrame = 0;
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Negate so the stage drifts the opposite way to scroll travel (reads as
      // depth). Range -1..1 → translateX -maxPx..maxPx.
      target = -viewportProgress(rect.top, rect.height, window.innerHeight);
      wake();
    };

    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sectionRef, stageRef, maxPx]);
}
```

- [ ] **Step 2: Typecheck**

Run: `bunx tsc --noEmit`
Expected: no errors from `useScrollParallax.ts` (pre-existing unrelated errors, if any, are out of scope — note them but don't fix here).

- [ ] **Step 3: Commit**

```bash
git add app/\(main\)/_sections/useScrollParallax.ts
git commit -m "feat(scroll): add useScrollParallax rAF drift hook"
```

---

### Task 3: Remove scroll→focus coupling from `useCoverflow`

**Files:**
- Modify: `app/(main)/_sections/useCoverflow.ts`

Goal: focus is driven only by `manualRef` (drag/keys/click). Delete `scrollFocus`, `scrubStart`, `scrubEnd`, and the `scroll` listener. Keep drag, arrow keys, click-to-centre, `centreOn`, `applyCards`, `wake`, and the `resize` listener (it re-runs `applyCards` so Phase 4 responsive spread works).

- [ ] **Step 1: Remove the two scrub options from the interface**

In `CoverflowOptions`, delete:

```ts
  scrubStart?: number;
  scrubEnd?: number;
```

And in the destructured params remove `scrubStart = 0.05,` and `scrubEnd = 0.9,`.

- [ ] **Step 2: Delete `scrollFocus` and simplify `setTarget`**

Delete the entire `scrollFocus` `useCallback` block. Replace `setTarget` with:

```ts
  // Focus is a free float driven solely by manual input (drag/keys/click).
  const setTarget = useCallback(() => {
    targetRef.current = manualRef.current;
    wake();
  }, [wake]);
```

- [ ] **Step 3: Replace the scroll/resize effect**

Replace the effect that currently adds the `scroll` + `resize` listeners (the one calling `setTarget` on scroll) with a resize-only effect:

```ts
  // Initial layout + keep layout correct on resize (spread may change — Phase 4).
  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        applyCards();
      });
    };
    applyCards();
    setTarget();
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
      window.removeEventListener("resize", onResize);
    };
  }, [applyCards, setTarget]);
```

- [ ] **Step 4: Typecheck**

Run: `bunx tsc --noEmit`
Expected: no new errors. (Consumers pass no `scrubStart`/`scrubEnd`, so removing them is safe.)

- [ ] **Step 5: Commit**

```bash
git add app/\(main\)/_sections/useCoverflow.ts
git commit -m "refactor(scroll): decouple coverflow focus from scroll position"
```

---

### Task 4: Convert `ProjectsSection` to normal flow + parallax

**Files:**
- Modify: `app/(main)/_sections/ProjectsSection.tsx`

- [ ] **Step 1: Remove the pinned-height constant**

Delete the line:

```ts
const SECTION_VH = 340; // pinned scrub region height
```

- [ ] **Step 2: Add imports + a stage ref, wire parallax**

Add to the import block:

```ts
import { useScrollParallax } from "./useScrollParallax";
```

Inside `ProjectsSection`, after the `useCoverflow(...)` call, add:

```ts
  const stageRef = useRef<HTMLDivElement>(null);
  useScrollParallax(sectionRef, stageRef, 40);
```

(`useRef` is already imported.)

- [ ] **Step 3: Replace the section + sticky wrapper markup**

Change the `<section>` opening tag from the pinned version to normal flow (remove the inline `height` style, add `min-h-screen`):

```tsx
    <section
      ref={sectionRef}
      id="projects"
      className="relative flex min-h-screen w-full flex-col overflow-hidden py-20 scroll-mt-24"
    >
```

Delete the `<div className="sticky top-0 flex h-screen w-full flex-col overflow-hidden">` wrapper opening tag and its matching closing `</div>` (the one right before `</section>`). Keep its children (the title row and stage) as direct children of the section.

- [ ] **Step 4: Attach the stage ref to the coverflow stage div**

On the coverflow stage `<div>` (the one with `{...stageHandlers}` and `cursor-grab`), add `ref={stageRef}`:

```tsx
        <div
          ref={stageRef}
          className={cn(
            "relative w-full flex-1 cursor-grab touch-pan-y select-none active:cursor-grabbing will-change-transform",
            selected !== null && "pointer-events-none opacity-0"
          )}
          style={{ transition: "opacity 300ms var(--ease-out-quart)" }}
          {...stageHandlers}
        >
```

- [ ] **Step 5: Typecheck**

Run: `bunx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Manual verification**

Run: `bun run dev`, open `http://localhost:3000`, scroll to PROJECTS.
Expected:
- Scrolling down passes the section by in ~one screen — **no pin, no multi-screen scroll trap**.
- Cards drift horizontally a little as the section moves through the viewport.
- Drag/swipe, ← →, click-to-centre, and click-centre-to-expand (FLIP) all still work.
- With OS "reduce motion" on, the drift is absent but the section still scrolls and cards still browse.

- [ ] **Step 7: Commit**

```bash
git add app/\(main\)/_sections/ProjectsSection.tsx
git commit -m "feat(scroll): Projects section normal-flow + parallax (no pin)"
```

---

### Task 5: Convert `MembersSection` to normal flow + parallax

**Files:**
- Modify: `app/(main)/_sections/MembersSection.tsx`

- [ ] **Step 1: Remove the pinned-height constant**

Delete:

```ts
const SECTION_VH = 320; // pinned scrub region height
```

- [ ] **Step 2: Add imports + stage ref + parallax**

Add to imports:

```ts
import { useRef } from "react";
import { useScrollParallax } from "./useScrollParallax";
```

(Note: current file imports `useState` from `"react"` — extend that to `import { useRef, useState } from "react";` rather than adding a duplicate line.)

Inside `MembersSection`, after the `useCoverflow(...)` call, add:

```ts
  const stageRef = useRef<HTMLDivElement>(null);
  useScrollParallax(sectionRef, stageRef, 32);
```

- [ ] **Step 3: Replace the section + sticky wrapper markup**

Change the `<section>` opening tag to:

```tsx
    <section
      ref={sectionRef}
      id="members"
      className="relative flex min-h-screen w-full flex-col overflow-hidden py-20 scroll-mt-24"
    >
```

Delete the `<div className="sticky top-0 flex h-screen w-full flex-col overflow-hidden">` opening tag and its matching closing `</div>` before `</section>`, keeping the title row and stage as direct section children.

- [ ] **Step 4: Attach stage ref to the coverflow stage div**

On the stage `<div>` carrying `{...stageHandlers}`:

```tsx
        <div
          ref={stageRef}
          className="relative w-full flex-1 cursor-grab touch-pan-y select-none active:cursor-grabbing will-change-transform"
          {...stageHandlers}
        >
```

- [ ] **Step 5: Typecheck**

Run: `bunx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Manual verification**

Run dev server, scroll to MEMBERS.
Expected: no pin; gentle drift; drag/swipe/arrows work; click flips the centred card (3D). Reduced-motion: no drift, still scrolls/flips.

- [ ] **Step 7: Commit**

```bash
git add app/\(main\)/_sections/MembersSection.tsx
git commit -m "feat(scroll): Members section normal-flow + parallax (no pin)"
```

---

### Task 6: Phase verification

- [ ] **Step 1: Full test + typecheck + lint**

```bash
bun test lib
bunx tsc --noEmit
bun run lint
```
Expected: tests pass (incl. new `parallax.test.ts`); no new type errors; lint clean.

- [ ] **Step 2: End-to-end manual pass**

Scroll the whole landing page top→bottom. Confirm: continuous vertical scroll throughout, no section ever traps/pins scrolling, Projects + Members drift subtly, all carousel interactions intact. Out-of-scope pinned sections (AboutTerminal, leaderboard podium, header) are unchanged.

---

## Self-Review

- **Spec coverage:** Phase 1 spec items — remove pin (Tasks 4–5), decouple focus (Task 3), parallax drift (Tasks 1–2 + wiring), reduced-motion gating (Task 2), preserve interactions (Tasks 4–5 verification). Covered.
- **Placeholder scan:** none — every code step shows complete code.
- **Type consistency:** `viewportProgress(rectTop, rectHeight, viewportHeight)` defined in Task 1 and called identically in Task 2; `useScrollParallax(sectionRef, stageRef, maxPx)` signature consistent across Tasks 2/4/5; `setTarget` retains its no-arg signature.
- **Note:** `will-change-transform` is added to the drifting stage now; Phase 5 will make `will-change` dynamic (toggle during motion) — acceptable interim.
