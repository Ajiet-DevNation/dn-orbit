# Carousel Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revamp the Projects & Members carousels with restyled cyber-retro cards, a GSAP-driven scroll glide (Projects left / Members right), and a lazy Three.js ambient backdrop — preserving every existing interaction.

**Architecture:** Keep `useCoverflow` as the primary interaction engine (drag/arrows/keys/click/detail/flip/intro). Add a GSAP `ScrollTrigger` glide on a *separate wrapper element* around the cards so it composes with (never overwrites) per-card transforms. Restyle cards via overlay FX layers whose opacity is driven by two CSS vars the engine already writes each frame. Add a self-contained, lazy, reduced-motion-safe Three.js particle backdrop per section.

**Tech Stack:** Next 16 / React 19 (React Compiler) / Tailwind v4 / bun / GSAP + ScrollTrigger / Three.js.

## Global Constraints

- Honor `prefers-reduced-motion`: the global CSS reset (`app/globals.css`) flattens CSS `animation`/`transition`. GSAP and Three.js bypass that reset, so each MUST self-gate (`gsap.matchMedia` / `matchMedia` check) and produce a static fallback.
- No scroll-jacking / no pinning. Glide is an additive parallax transform only.
- Preserve: project detail FLIP modal, member 3D flip, pointer drag, ◀ ▶ arrows, keyboard arrows, `NN / NN` counter, idle auto-advance.
- Brand green `#22c55e`; keep `8bit-card` / `retro` pixel styling.
- Package manager: `bun`. Lint: `bun run lint`. Build: `next build`. Unit tests: `bun test lib`.
- Transforms/opacity only for per-frame motion; `will-change` promoted only while animating.

---

### Task 1: Dependencies, GSAP setup, remove dead parallax

**Files:**
- Modify: `package.json` (+ `bun.lock`)
- Create: `lib/gsap.ts`
- Delete: `app/(main)/_sections/useScrollParallax.ts`, `lib/parallax.ts`, `lib/parallax.test.ts`

**Interfaces:**
- Produces: `import { gsap, ScrollTrigger } from "@/lib/gsap"` — GSAP with ScrollTrigger registered exactly once, client-only.

- [ ] **Step 1: Install deps**
```bash
bun add gsap three && bun add -d @types/three
```
- [ ] **Step 2: Central GSAP module** — `lib/gsap.ts`:
```ts
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register plugins once, client-only. Imported anywhere ScrollTrigger is needed
// so registration can't be forgotten or duplicated.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };
```
- [ ] **Step 3: Remove dead parallax** (confirmed unused by grep):
```bash
git rm app/(main)/_sections/useScrollParallax.ts lib/parallax.ts lib/parallax.test.ts
```
- [ ] **Step 4: Verify** — `bun test lib` (remaining tests pass), `bun run lint` clean, `npx tsc --noEmit` (or `next build`) — no references to deleted files.
- [ ] **Step 5: Commit** — `chore: add gsap+three, drop unused parallax hook`.

---

### Task 2: Pure glide endpoint mapping (TDD)

**Files:**
- Create: `lib/glide.ts`, `lib/glide.test.ts`

**Interfaces:**
- Produces: `glideEndpoints(direction: -1 | 1, distancePx: number): { fromX: number; toX: number }` — GSAP x endpoints. `-1` ⇒ net leftward (Projects), `+1` ⇒ rightward (Members).

- [ ] **Step 1: Failing test** — `lib/glide.test.ts`:
```ts
import { test, expect } from "bun:test";
import { glideEndpoints } from "./glide";

test("projects (-1) drift net leftward: end x < start x", () => {
  const { fromX, toX } = glideEndpoints(-1, 100);
  expect(fromX).toBe(100);
  expect(toX).toBe(-100);
  expect(toX).toBeLessThan(fromX);
});

test("members (+1) drift net rightward: end x > start x", () => {
  const { fromX, toX } = glideEndpoints(1, 100);
  expect(fromX).toBe(-100);
  expect(toX).toBe(100);
  expect(toX).toBeGreaterThan(fromX);
});
```
- [ ] **Step 2: Run, expect FAIL** — `bun test lib/glide.test.ts`.
- [ ] **Step 3: Implement** — `lib/glide.ts`:
```ts
// Pure mapping from glide direction to GSAP x endpoints (px). As the section
// scrolls from entering (bottom) to leaving (top), x travels fromX -> toX,
// passing through 0 mid-viewport. direction -1 nets leftward (Projects);
// +1 nets rightward (Members).
export function glideEndpoints(
  direction: -1 | 1,
  distancePx: number
): { fromX: number; toX: number } {
  const d = Math.sign(direction) || 1;
  return { fromX: -d * distancePx, toX: d * distancePx };
}
```
- [ ] **Step 4: Run, expect PASS** — `bun test lib/glide.test.ts`.
- [ ] **Step 5: Commit** — `feat: pure glide endpoint mapping`.

---

### Task 3: useScrollGlide hook (GSAP ScrollTrigger)

**Files:**
- Create: `app/(main)/_sections/useScrollGlide.ts`

**Interfaces:**
- Consumes: `glideEndpoints` (Task 2), `gsap` (Task 1).
- Produces: `useScrollGlide(sectionRef, stageRef, { direction, distancePx?, scrub? })`.

- [ ] **Step 1: Implement** — `app/(main)/_sections/useScrollGlide.ts`:
```ts
"use client";

import { useEffect } from "react";
import { gsap } from "@/lib/gsap";
import { glideEndpoints } from "@/lib/glide";

// Scroll-linked horizontal glide for a carousel stage wrapper (GSAP ScrollTrigger).
// As the section travels the viewport the wrapper drifts horizontally: direction
// -1 nets leftward (Projects), +1 rightward (Members). One compositor transform on
// a PARENT of the cards, so it composes with the per-card coverflow transforms
// instead of fighting them. Never created under reduced motion (gsap.matchMedia),
// honoring the global CSS reset. scrub gives a fast-but-buttery lag.
interface GlideOptions {
  direction: -1 | 1;
  distancePx?: number;
  scrub?: number;
}

export function useScrollGlide(
  sectionRef: React.RefObject<HTMLElement | null>,
  stageRef: React.RefObject<HTMLElement | null>,
  { direction, distancePx = 160, scrub = 0.6 }: GlideOptions
): void {
  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    const { fromX, toX } = glideEndpoints(direction, distancePx);

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        stage,
        { x: fromX },
        {
          x: toX,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub,
            invalidateOnRefresh: true,
          },
        }
      );
    });

    return () => mm.revert(); // kills tween + ScrollTrigger and clears props
  }, [sectionRef, stageRef, direction, distancePx, scrub]);
}
```
- [ ] **Step 2: Verify** — `bun run lint`, `npx tsc --noEmit`. (Wired up in Tasks 6–7.)
- [ ] **Step 3: Commit** — `feat: useScrollGlide GSAP scroll hook`.

---

### Task 4: Engine writes depth/center CSS vars

**Files:**
- Modify: `app/(main)/_sections/useCoverflow.ts` (inside `applyCards`)

**Interfaces:**
- Produces: each card wrapper gets `--cf-depth` (0→~0.6 darken for side cards) and `--cf-center` (1 at centre → 0) every frame. Behavior otherwise unchanged.

- [ ] **Step 1:** In `applyCards`, after `el.style.opacity = ...` (around line 155), add:
```ts
      // Depth/emphasis vars consumed by the card FX overlays (opacity only, so
      // they stay compositor-cheap). Side cards darken; the centre card glows.
      el.style.setProperty("--cf-depth", String(Math.min(ad * 0.3, 0.6)));
      el.style.setProperty("--cf-center", String(Math.max(0, 1 - ad)));
```
- [ ] **Step 2: Verify** — `bun run lint`, `npx tsc --noEmit`; existing coverflow still renders (manual).
- [ ] **Step 3: Commit** — `feat: coverflow depth/center vars for card FX`.

---

### Task 5: Card FX overlay (styles + component)

**Files:**
- Modify: `app/globals.css` (append FX classes)
- Create: `app/(main)/_sections/CoverflowCardFx.tsx`

**Interfaces:**
- Consumes: `--cf-depth`, `--cf-center` (Task 4).
- Produces: `<CoverflowCardFx variant="full" | "depth" />` — absolute, `pointer-events-none` overlay placed inside a card wrapper.

- [ ] **Step 1: globals.css** — append under the card section:
```css
/* ── Coverflow card FX (opacity driven by --cf-center / --cf-depth) ── */
.cf-sheen {
  background: linear-gradient(
    115deg,
    transparent 32%,
    rgba(255, 255, 255, 0.1) 47%,
    rgba(255, 255, 255, 0.22) 50%,
    rgba(255, 255, 255, 0.1) 53%,
    transparent 68%
  );
  mix-blend-mode: screen;
}
.cf-scanlines {
  background: repeating-linear-gradient(
    0deg,
    transparent 0px,
    transparent 2px,
    rgba(0, 0, 0, 0.16) 3px,
    transparent 4px
  );
  mix-blend-mode: multiply;
}
.cf-bloom {
  box-shadow:
    0 0 30px rgba(34, 197, 94, 0.32),
    inset 0 0 18px rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.35);
}
```
- [ ] **Step 2: Component** — `CoverflowCardFx.tsx`:
```tsx
import { memo } from "react";

// Decorative overlay layers for coverflow cards. Opacity is driven by the
// engine's per-frame --cf-center / --cf-depth vars (compositor-cheap). "full"
// adds the glassy sheen + scanlines (Projects); "depth" keeps only the depth
// darken + centre bloom so it never washes over the Members card's bio text.
export const CoverflowCardFx = memo(function CoverflowCardFx({
  variant = "full",
}: {
  variant?: "full" | "depth";
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: "var(--cf-depth, 0)" }}
      />
      {variant === "full" && (
        <>
          <div
            className="cf-sheen absolute inset-0"
            style={{ opacity: "calc(var(--cf-center, 0) * 0.7)" }}
          />
          <div
            className="cf-scanlines absolute inset-0"
            style={{ opacity: "calc(var(--cf-center, 0) * 0.45)" }}
          />
        </>
      )}
      <div
        className="cf-bloom absolute inset-[-1px]"
        style={{ opacity: "var(--cf-center, 0)" }}
      />
    </div>
  );
});
```
- [ ] **Step 3: Verify** — `bun run lint`, `npx tsc --noEmit`.
- [ ] **Step 4: Commit** — `feat: coverflow card FX overlay`.

---

### Task 6: Projects section — glide wrapper + FX + glide-left

**Files:**
- Modify: `app/(main)/_sections/ProjectsSection.tsx`

**Interfaces:**
- Consumes: `useScrollGlide` (Task 3), `CoverflowCardFx` (Task 5).

- [ ] **Step 1:** Imports — add `useScrollGlide`, `CoverflowCardFx`; add a `glideRef`:
```tsx
import { useScrollGlide } from "./useScrollGlide";
import { CoverflowCardFx } from "./CoverflowCardFx";
// inside component:
const glideRef = useRef<HTMLDivElement>(null);
useScrollGlide(sectionRef, glideRef, {
  direction: -1,
  distancePx: Math.round(vw * 0.16),
});
```
- [ ] **Step 2:** Wrap the cards in the glide wrapper (between `<CoverflowFloor />` and `<CoverflowControls/>`). The wrapper is `absolute inset-0` with `transform-style: preserve-3d` so the stage's `perspective` still reaches the cards:
```tsx
<CoverflowFloor />
<div
  ref={glideRef}
  className="absolute inset-0"
  style={{ transformStyle: "preserve-3d" }}
>
  {projects.map((project, i) => (
    /* unchanged card wrapper … add <CoverflowCardFx /> after <ProjectCard/> */
  ))}
</div>
<CoverflowControls … />
```
- [ ] **Step 3:** Inside each card wrapper, after `<ProjectCard … />`, add `<CoverflowCardFx variant="full" />`.
- [ ] **Step 4: Verify** — run app (`bun run dev`): cards glide **left** on scroll, smooth/high-fps; drag/arrows/keys/counter/auto-advance work; detail FLIP modal opens & closes correctly; side cards darken, centre card glows. `bun run lint`.
- [ ] **Step 5: Commit** — `feat: projects carousel glide-left + card FX`.

---

### Task 7: Members section — glide-right + depth FX

**Files:**
- Modify: `app/(main)/_sections/MembersSection.tsx`

**Interfaces:**
- Consumes: `useScrollGlide`, `CoverflowCardFx`.

- [ ] **Step 1:** Add `glideRef` + `useScrollGlide(sectionRef, glideRef, { direction: 1, distancePx: Math.round(vw * 0.16) })`; import `CoverflowCardFx`.
- [ ] **Step 2:** Wrap the member cards in the same `absolute inset-0` / `preserve-3d` glide wrapper. **Keep** each card's inner `perspective: 1200` (front/back flip) — it is independent of the stage perspective.
- [ ] **Step 3:** Inside each member card wrapper, after `<MemberCard … />`, add `<CoverflowCardFx variant="depth" />` (depth + bloom only, so the flipped bio stays readable).
- [ ] **Step 4: Verify** — cards glide **right** on scroll; flip on click still works; drag/arrows/counter/auto-advance intact; side cards recede. `bun run lint`.
- [ ] **Step 5: Commit** — `feat: members carousel glide-right + depth FX`.

---

### Task 8: Three.js ambient backdrop (lazy)

**Files:**
- Create: `app/(main)/_sections/SectionBackdrop.tsx`
- Modify: `ProjectsSection.tsx`, `MembersSection.tsx` (mount lazily; raise content z)

**Interfaces:**
- Produces: default-exported `SectionBackdrop` client component; mounted via `next/dynamic` `{ ssr: false }`.

- [ ] **Step 1: Backdrop** — `SectionBackdrop.tsx` (Three.js points field; null under reduced motion; IO-paused offscreen; disposes on unmount):
```tsx
"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function SectionBackdrop({ tint = "#22c55e" }: { tint?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const w = mount.clientWidth || 1;
    const h = mount.clientHeight || 1;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    camera.position.z = 60;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    mount.appendChild(renderer.domElement);

    const COUNT = 300;
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 170;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 110;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 130;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(tint),
      size: 0.95,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geom, mat);
    scene.add(points);

    let raf = 0;
    const clock = new THREE.Clock();
    const render = () => {
      const t = clock.getElapsedTime();
      points.rotation.y = t * 0.04;
      points.rotation.x = Math.sin(t * 0.1) * 0.05;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(render);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? start() : stop()),
      { threshold: 0 }
    );
    io.observe(mount);

    const onResize = () => {
      const nw = mount.clientWidth || 1;
      const nh = mount.clientHeight || 1;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener("resize", onResize);
      geom.dispose();
      mat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount)
        mount.removeChild(renderer.domElement);
    };
  }, [tint]);

  return <div ref={mountRef} aria-hidden className="absolute inset-0" />;
}
```
- [ ] **Step 2: Mount in both sections** — top of each module:
```tsx
import dynamic from "next/dynamic";
const SectionBackdrop = dynamic(() => import("./SectionBackdrop"), { ssr: false });
```
As the **first** child of each `<section>`:
```tsx
<div aria-hidden className="pointer-events-none absolute inset-0 z-0">
  <SectionBackdrop tint="#22c55e" />
</div>
```
Add `relative z-[1]` to the title row `<div>` and the stage `<div>` in each section so content paints above the backdrop.
- [ ] **Step 3: Verify** — backdrop visible behind cards, no z-index regressions, cards/controls fully interactive, no console errors; reduced-motion → no canvas mounted; navigate away → no leaked WebGL contexts. `bun run lint`, `next build`.
- [ ] **Step 4: Commit** — `feat: lazy three.js ambient backdrop`.

---

### Task 9: Full verification pass

- [ ] **Step 1:** `bun test lib` — all pass.
- [ ] **Step 2:** `bun run lint` — clean.
- [ ] **Step 3:** `next build` — succeeds.
- [ ] **Step 4: Manual matrix** — Projects glide left / Members glide right (fast + smooth); drag, ◀ ▶, arrow keys, counter, auto-advance; project detail FLIP; member flip; side-card depth + centre glow; Three backdrop; `prefers-reduced-motion` static fallback (DevTools emulation); DevTools performance shows stable ~60fps while scrolling.
- [ ] **Step 5: Commit** any tuning — `chore: carousel revamp verification + tuning`.

## Self-review notes

- **Spec coverage:** glide (T2/T3/T6/T7), card restyle (T4/T5), entrance kept in engine (per spec update), Three.js backdrop (T8), reduced-motion (T1 setup, gated in T3/T8), dead-code removal (T1). All covered.
- **Type consistency:** `glideEndpoints(direction, distancePx)` and `useScrollGlide(sectionRef, stageRef, opts)` used identically across tasks. CSS vars `--cf-depth` / `--cf-center` produced in T4, consumed in T5.
