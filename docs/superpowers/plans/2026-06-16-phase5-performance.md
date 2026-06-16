# Phase 5: Performance & Thermal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** Eliminate permanent GPU-layer over-allocation and idle CPU work so the site holds ~60fps without thermal drain. Make `will-change` dynamic (on only during active animation), and pause autonomous motion under reduced-motion.

**Architecture:** The two rAF controllers (`useScrollParallax`, `useCoverflow`) already start/stop cleanly, so they're the right place to toggle `will-change`: set it when a loop wakes, clear it when it settles. Static `will-change-transform` classes (carousel stages, every card, the FLIP card, every event card) are removed. The announcement marquee gains a reduced-motion pause and visibility-gated `will-change`.

**Out of scope:** LeaderboardSection's podium reveal `will-change` (bounded one-shot reveal; touching it risks the animation) and vendor `8bit-toast` CSS.

---

### Task 1: Dynamic `will-change` in `useScrollParallax`

**Files:** `app/(main)/_sections/useScrollParallax.ts`

- [ ] In `kick()`, when (re)starting the loop, promote the stage: after setting `raf`, add `if (stageRef.current) stageRef.current.style.willChange = "transform";`
- [ ] In `frame()`, in the pause branch (`if (settled && sameScroll) { raf = 0; ... }`), demote: add `if (stageRef.current) stageRef.current.style.willChange = "";` before `return;`
- [ ] In the effect cleanup (`return () => { stop(); ... }`) and in the reduced-motion early-return, ensure `willChange` is cleared (the reduced-motion branch already sets `transform = ""`; also set `willChange = ""`).
- [ ] `bunx tsc --noEmit`. **Commit** `perf: dynamic will-change on parallax stage`.

---

### Task 2: Dynamic `will-change` in `useCoverflow`

**Files:** `app/(main)/_sections/useCoverflow.ts`

- [ ] Add a helper near `applyCards`:

```ts
  const setCardsWillChange = useCallback((value: string) => {
    for (const el of cardRefs.current) if (el) el.style.willChange = value;
  }, []);
```

- [ ] In `wake()`, before scheduling the first frame, call `setCardsWillChange("transform");`
- [ ] In the `step` settle branch (`if (Math.abs(diff) < 0.001) { ... runningRef.current = false; ... }`), call `setCardsWillChange("");` before `return;`
- [ ] In the layout effect cleanup, also clear: `setCardsWillChange("")` is safe to call there.
- [ ] `bunx tsc --noEmit`. **Commit** `perf: dynamic will-change on coverflow cards`.

---

### Task 3: Remove static `will-change-transform` from carousels

**Files:** `app/(main)/_sections/ProjectsSection.tsx`, `MembersSection.tsx`

- [ ] **Projects:** remove `will-change-transform` from (a) the stage `<div ref={stageRef}>` class, (b) the card wrapper `className="group absolute left-1/2 top-1/2 cursor-pointer will-change-transform"`, and (c) the FLIP card `className="shrink-0 will-change-transform"`. The hooks now manage promotion; the FLIP card's transient transition composites fine without a permanent hint.
- [ ] **Members:** remove `will-change-transform` from the stage `<div ref={stageRef}>` class and the card wrapper `className="absolute left-1/2 top-1/2 will-change-transform"`.
- [ ] `bunx tsc --noEmit` + `bun run lint`. **Commit** `perf: drop permanent will-change on carousel elements`.

---

### Task 4: EventsSection — remove permanent `will-change`

**Files:** `app/(main)/_sections/EventsSection.tsx`

- [ ] Remove `will-change-transform` from the card wrapper (line ~36): `group h-full transition-transform duration-300 ease-out will-change-transform hover:-translate-y-1.5 hover:scale-[1.02]` → drop `will-change-transform`. (Hover transform composites on demand; permanent promotion on every event card is the over-allocation to avoid.)
- [ ] `bunx tsc --noEmit`. **Commit** `perf: drop permanent will-change on event cards`.

---

### Task 5: AnnouncementCarousel — reduced-motion pause + visibility-gated will-change

**Files:** `app/(main)/_sections/AnnouncementCarousel.tsx`

- [ ] **Reduced-motion pause:** in the auto-drift effect, compute once:

```ts
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
```
and change the frame's guard to `if (draggingRef.current || !onScreenRef.current || reduce) return;` so the strip holds still for reduced-motion users (drag still works).

- [ ] **Visibility-gated will-change:** remove the static `will-change-transform` from the track `<div ref={trackRef} className="flex w-max will-change-transform">` → `className="flex w-max"`. In the IntersectionObserver callback, set it with visibility:

```ts
        onScreenRef.current = entry.isIntersecting;
        if (trackRef.current)
          trackRef.current.style.willChange = entry.isIntersecting ? "transform" : "";
```

- [ ] `bunx tsc --noEmit` + `bun run lint`. **Commit** `perf: announcement strip respects reduced-motion + gated will-change`.

---

### Task 6: Verify

- [ ] `bun test lib`, `bunx tsc --noEmit`, `bun run lint` clean.
- [ ] `grep -rn 'will-change-transform' app/(main)/_sections` → only dynamic (none static) remain.
- [ ] Render smoke: `/` 200, no runtime errors.
- [ ] Manual (developer, DevTools Performance / Rendering → "Layer borders"): during carousel scroll/drag, stage+cards are promoted; **at rest no persistent compositing layers**; reduced-motion stops drift; scroll holds ~60fps.

---

## Self-Review

- **Spec coverage:** will-change discipline / no over-allocation (T1–T4), reduced-motion gating of autonomous motion (T5; parallax already gated in Phase 1), transform/opacity-only confirmed by audit (no layout-prop animations in our code; vendor toast excluded), passive listeners + rAF already in place. Covered.
- **Type consistency:** `setCardsWillChange(value: string)` defined and called consistently; `willChange` set/clear paired in every controller (kick/settle/cleanup) so no element is left permanently promoted.
- **Risk:** removing permanent `will-change` can't break correctness (it's a hint); worst case is a momentary first-frame paint, mitigated by the controllers promoting on wake.
