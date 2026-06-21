# Projects & Members Carousel Revamp — Design

**Date:** 2026-06-21
**Branch:** `feat/carousel-revamp`
**Status:** Approved (pending spec review)

## Goal

Revamp the Projects and Members card carousels with bolder card styling and
new, signature motion built on **GSAP** (hero motion) and **Three.js** (a lazy
ambient backdrop). Add a **scroll-linked horizontal glide** — the Projects row
drifts **left** and the Members row drifts **right** as the section travels
through the viewport. The glide must read as *quite fast yet very smooth* and
hold a high, stable frame rate. All existing interactions must keep working.

## Constraints & context

- **Global reduced-motion reset.** `app/globals.css` (`@media (prefers-reduced-motion: reduce)`)
  forces `animation-duration`/`transition-duration` to ~0 for *every* element.
  CSS-driven motion is therefore flattened. The current coverflow sidesteps this
  by animating imperatively via `requestAnimationFrame`. **GSAP JS tweens and the
  Three.js canvas are not affected by that CSS reset**, so this revamp MUST gate
  its own motion behind `gsap.matchMedia` / a `prefers-reduced-motion` check to
  honor the user's preference. (See memory: `reduced-motion-global-reset`.)
- **No scroll-jacking.** Decision: additive parallax-drift, not pinning. The page
  scroll is never hijacked.
- **Preserve interactions (all confirmed required):** project detail modal (FLIP
  fly-in), member card 3D flip, pointer drag, ◀ ▶ arrow buttons, keyboard arrows,
  the `NN / NN` counter, idle auto-advance, and reduced-motion safety.
- **Stack:** Next 16, React 19 (React Compiler on), Tailwind v4, `bun`. Cards use
  the existing `8bit-card` / `retro` pixel styling and the brand green `#22c55e`.

## Current architecture (what exists today)

- `app/(main)/_sections/useCoverflow.ts` — a hand-written rAF 3D coverflow engine.
  Writes per-card `transform`/`opacity`/`zIndex`/`pointerEvents` imperatively to
  refs (no per-frame React renders). Owns drag, keys, click-to-center, idle
  auto-advance, an intro fan-in ease, and reduced-motion handling. Exposes
  `sectionRef, registerCard, onCardClick, next, prev, goTo, activeIndex, count,
  stageHandlers`.
- `ProjectsSection.tsx` — coverflow + FLIP shared-element transition into a
  fullscreen detail overlay (description, tech chips, GitHub/demo).
- `MembersSection.tsx` — coverflow + 3D front/back flip card (role → bio + socials).
- `CoverflowControls.tsx` — pixel arrows, `NN / NN` counter, floor glow.
- `useViewportWidth.ts` — responsive card sizing.

## Approach (chosen)

### A. Scroll-linked glide — additive parallax-drift layer

Keep the coverflow engine as the **primary** interaction, fully intact. Add a
**single GSAP `ScrollTrigger` (scrubbed)** that maps the section's progress
through the viewport to **one horizontal `transform` on a dedicated wrapper
`<div>`** that sits *between* the stage (perspective owner) and the absolutely
positioned cards.

- Projects wrapper: drifts toward **negative X (left)**.
- Members wrapper: drifts toward **positive X (right)**.
- Travel is bounded but pronounced (visible glide, not a micro-nudge). Tunable
  via a single `distance` constant (target: a meaningful fraction of viewport
  width across the section's scroll range).
- Smoothing: `scrub` with a small time value (~0.6–0.9s) for a fast-but-buttery
  lag. Because it is **one compositor transform on a parent**, it composes with
  the per-card coverflow transforms instead of fighting them, and stays GPU-bound
  (target 60–120fps).
- Click-to-center already resolves against the rounded focus, so opening a card
  still selects the correct one with the drift applied.

**Rejected alternative — scroll-scrubbed focus (pinned):** pin the section and
scrub the coverflow focus so the user scrolls *through* the cards. More dramatic
but hijacks scroll, is fragile alongside drag, and is an accessibility/jank risk
on a `min-h-screen` section. Not used.

### B. Card restyle (cyber-retro, on the existing 8-bit base)

Stay on `8bit-card`; add depth and life. Preserve pixel font, status badges,
member role/ALUMNI headers, and the green palette.

1. **Distance-driven depth shading.** Side cards get a darken + slight desaturate
   overlay; the center card reads bright and forward. Implemented by extending the
   engine's existing `applyCards` loop to also write **one overlay element's
   `opacity`** per card (compositor-cheap, no new render path).
2. **Specular sheen / glassy glare.** A soft diagonal light streak per card whose
   position/intensity tracks the card's `rotateY`, for a reflective "screen" feel.
3. **Centered-card emphasis.** Animated scanline sweep + green bloom edge + subtle
   CRT vignette on whichever card is centered.
4. **Floor reflection** under the centered card, augmenting the current floor glow,
   to ground the row.

### C. Entrance (GSAP timeline)

Replace the hand-rolled intro ease in `useCoverflow` with a **GSAP timeline**:
cards fan in with stagger + 3D rotation + blur→sharp + rise, fired once on
`ScrollTrigger` `onEnter`. Under reduced motion the row is simply present (no
entrance).

### D. Three.js ambient backdrop (lazy)

One lightweight, self-contained WebGL layer **per section** (drifting brand-green
particles / shader grid), behind the cards:

- `next/dynamic` import with `ssr: false`; mounted only on the client and only
  when the section is near the viewport.
- **Not mounted** under `prefers-reduced-motion`.
- Cards remain DOM (text stays crisp). The backdrop is purely decorative and can
  be deleted without touching the carousel.
- Disposes its renderer/geometry/material on unmount; pauses its rAF when offscreen.

## Components & boundaries

| Unit | Responsibility | Depends on |
| --- | --- | --- |
| `useScrollGlide.ts` (new) | Own the scrubbed `ScrollTrigger` that drifts a wrapper ref horizontally by `direction` (-1/+1). `gsap.matchMedia` for reduced-motion + breakpoint tuning. Full cleanup (kill triggers) on unmount. | `gsap`, `ScrollTrigger` |
| `useCoverflow.ts` (extend) | Unchanged behavior; additionally write a per-card depth-overlay `opacity` in `applyCards`, and expose a hook for the GSAP entrance timeline. | — |
| `CoverflowCard.tsx` (new, shared chrome) | Presentational wrapper adding sheen / scanline / reflection / vignette layers around the existing card faces. | — |
| `SectionBackdrop.tsx` (new, lazy) | Self-contained Three.js ambient layer; reduced-motion-aware; offscreen-paused; disposes on unmount. | `three` |
| `ProjectsSection.tsx` (edit) | Wrap card track in the glide wrapper, pass `direction = -1`. Mount lazy backdrop. Detail modal logic unchanged. | above |
| `MembersSection.tsx` (edit) | Wrap card track in the glide wrapper, pass `direction = +1`. Mount lazy backdrop. Flip logic unchanged. | above |
| `CoverflowControls.tsx` (light edit) | Floor glow may gain the reflection; arrows/counter unchanged. | — |

**Dependencies to add:** `gsap` (ScrollTrigger is free as of GSAP 3.12). `three`
(+ `@types/three` dev) for §D.

## Data flow

1. Section mounts → `useCoverflow` lays out cards imperatively (unchanged).
2. `useScrollGlide` registers a scrubbed `ScrollTrigger` on the section; scroll
   progress → wrapper `x` (signed by `direction`). One transform, GPU-bound.
3. `ScrollTrigger onEnter` (once) → GSAP entrance timeline staggers the cards in.
4. Lazy `SectionBackdrop` mounts client-side near viewport; animates until offscreen.
5. User interactions (drag/arrows/keys/click) drive `useCoverflow` exactly as
   today; the glide wrapper transform is independent and additive.

## Error handling & edge cases

- **Reduced motion:** `gsap.matchMedia` registers no glide/entrance; backdrop not
  mounted; cards present and static. Verified against the global CSS reset.
- **Unmount / route change:** kill all ScrollTriggers and the GSAP context; dispose
  Three.js resources; cancel rAFs. No leaked listeners or compositing layers.
- **Resize:** `ScrollTrigger.refresh()` on resize; existing coverflow resize path
  retained.
- **SSR:** GSAP/ScrollTrigger registered only in the browser; Three backdrop is
  `ssr: false`. No hydration mismatch.
- **Low core count / no WebGL:** backdrop fails closed (renders nothing) — carousel
  fully functional without it.
- **`will-change`** promoted only while animating (mirrors the existing engine),
  demoted at rest.

## Testing & verification

- `bun run lint` clean; `next build` succeeds.
- Manual run: confirm (a) Projects glide left / Members glide right on scroll,
  smooth and high-FPS; (b) drag, arrows, keys, counter, auto-advance all work;
  (c) project detail modal + member flip unchanged; (d) reduced-motion yields a
  static, calm fallback; (e) no console errors, no leaked listeners on navigation.
- Frame-rate spot check via DevTools performance while scrolling the sections.

## Out of scope (YAGNI)

- No scroll-jacking / pinned scroll-through.
- No rewrite of the coverflow engine's interaction model.
- No change to project/member data sources, modals' content, or admin pages.
- No heavier reactive WebGL scene (declined in favor of the lazy ambient backdrop).
