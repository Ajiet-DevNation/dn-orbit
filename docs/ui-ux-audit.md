# UI/UX audit — motion, feel and mobile

Audit of the whole app against Emil Kowalski's design-engineering skills
(`emilkowalski/skills`, installed to `.claude/skills/`): `emil-design-eng`,
`review-animations` (+ `STANDARDS.md`), `improve-animations` (+ `AUDIT.md`),
`find-animation-opportunities` and `mobile-native`. Every finding below was
re-read at its `file:line` before it was listed, and every one is fixed on
branch `feat/orbit-polish-hardening` unless its status says otherwise.

## Recon

| | |
| --- | --- |
| Stack | Next.js 16.4 App Router, React 19 (canary channel for `<ViewTransition>`), Tailwind v4 |
| Motion tools | Hand-rolled rAF loops (signature motion), CSS transitions/keyframes, GSAP (one hook), framer-motion (one component — now removed), native View Transitions |
| Tokens | `--ease-out-quart: cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-out-back`, new `--ease-in-out-strong: cubic-bezier(0.77, 0, 0.175, 1)` and `--vt-*` durations |
| Personality | Playful 8-bit / CRT. Stepped (quantised) motion is the house style and is respected, not reported. |
| Reduced motion | `globals.css` flattens every CSS animation/transition with `!important` (deliberate, documented in AGENTS.md). rAF loops must branch on `matchMedia` themselves. |
| Frequency map | **Hundreds/day:** none. **Tens/day:** card hovers (events, projects, announcements, about), coverflow card changes (arrow keys + scroll). **Occasional:** modals, detail overlays, admin drawer, recruitment strip → form. **Rare:** boot splash, hero entrance, recruitment popup, wordmark decode. |

## Findings (prioritised by leverage)

| # | Severity | Category | Location | Finding | Fix summary | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | HIGH | Purpose & frequency | `components/home/OrbitStage.tsx:1008` | Orbit planets could not be clicked: the drag handler captured every press, so the links' `click` went to the stage. The hero's only real interaction was broken. | Skip drag start when the press lands on a link | Fixed |
| 2 | HIGH | Performance | `components/home/OrbitStage.tsx:352` | The hero entrance tween was React state set every rAF frame, re-rendering the whole 1,400-line stage for ~2.4s during hydration | Tween writes styles straight to the DOM through refs | Fixed |
| 3 | HIGH | Purpose & frequency | `components/ui/BootSplash.tsx:21` | A 2.2–4.5s splash blocked every full page load, including `/recruitments` and event registration, where people came to fill a form | Splash only on `/`; other routes show content at once | Fixed (Task 6) |
| 4 | HIGH | Easing & duration | `hooks/useCardPowerOn.ts:30` | Bracket "power-on" bounced from `scale(0.55)` with `back.out(2.2)` over 450ms on **every** coverflow card change, arrow-key presses included | `scale(0.9)` → 1, 200ms, `power3.out`, no overshoot | Fixed |
| 5 | HIGH | Easing & duration | `components/home/EventsSection.tsx:90,93` | Banner zoom on hover ran 500ms to `scale(1.1)` — a tens-per-day hover, over the 300ms UI budget | 250ms ease-out to `scale(1.05)` | Fixed |
| 6 | HIGH | Accessibility / mobile | `components/home/EventsSection.tsx:404`, `components/admin/SystemLogs.tsx:80`, `components/ui/8bit-command.tsx:89` | Search inputs at 10–14px → iOS Safari zooms the page on focus and it then pans sideways | `text-base` below `md`, small pixel text from `md` up | Fixed |
| 7 | MEDIUM | Physicality | `components/home/EventsSection.tsx:69` | Event cards (clickable) had no press feedback | `active:scale-[0.99]` at 150ms on the hover wrapper | Fixed |
| 8 | MEDIUM | Interruptibility & timing | `components/home/EventsSection.tsx:196`, `components/home/ProjectsSection.tsx:226` | Detail panels entered and left with the same 400ms — symmetric timing where closing should snap | 400ms in, 200ms out | Fixed |
| 9 | MEDIUM | Performance | `components/home/ProjectsSection.tsx:198` | Progress bar animated `width` (layout) — and the value never changes after mount, so the transition did nothing but cost | Transition deleted (remedial step 1) | Fixed |
| 10 | MEDIUM | Accessibility | `app/globals.css:389` | `.about-card:hover` glow ungated → sticks on after a tap; 400ms | Gated behind `(hover: hover) and (pointer: fine)`, 200ms | Fixed |
| 11 | MEDIUM | Easing & duration | `components/home/AnnouncementCarousel.tsx:97` | Hover border colour over 500ms | 200ms | Fixed |
| 12 | MEDIUM | Easing & duration | `components/home/EventsSection.tsx:69–122`, `ProjectsSection.tsx:512` | Card hover lift/glow/colour at 300ms — the top of the budget for tens-per-day hovers | 200ms | Fixed |
| 13 | MEDIUM | Easing & duration | `components/layout/AdminSidebar.tsx:90` | Mobile admin drawer: default curve, 300ms both ways; `h-screen` hid its footer under the iOS toolbar | iOS drawer curve `cubic-bezier(0.32, 0.72, 0, 1)`, 300ms in / 200ms out, `inset-y-0` sizing | Fixed |
| 14 | MEDIUM | Accessibility | `components/home/OrbitStage.tsx` (physics loop) | The orbit physics rAF loop had no reduced-motion path (AGENTS.md rule); the 17s shatter show could fire; the entrance grew + blurred regardless | Reduced motion: no self-driven orbit/tumble, no shatter, entrance is fade-only | Fixed |
| 15 | MEDIUM | Missed opportunity (jarring change) | RECRUITING strip → `/recruitments` | Route change cut straight to the new page | View transition: strip morphs into the JOIN card, form rises in, header pinned | Fixed (Task 4) |
| 16 | MEDIUM | Performance | `components/ui/Reveal.tsx` | framer-motion (~35 KB gz) shipped for a single fade-up, using the main-thread `y` shorthand | IntersectionObserver + CSS transition on `opacity`/`translate`; dependency removed | Fixed |
| 17 | LOW | Easing & duration | `components/home/MembersSection.tsx:26` | Card flip 560ms | 480ms (curve kept: it is documented as the deliberate "real card turn") | Fixed |
| 18 | LOW | Physicality | `components/home/PlutonStage.tsx:116` | Speech bubble popped from `scale(0)` | Steps from `scale(0.6)` + opacity, keeps the 4 hard steps and bottom-left origin | Fixed |
| 19 | LOW | Performance | `app/admin/leaderboard/LeaderboardPreview.tsx:66`, `components/ui/tabs.tsx:86` | `transition-all` | Exact properties (`transition-colors`, `transition-[color,background-color,box-shadow]`) | Fixed |
| 20 | LOW | Cohesion & tokens | `components/layout/V2Header.tsx:141` | Hand-typed copy of `--ease-out-quart`; `will-change` held for the page's lifetime after a one-off reveal | Uses the token; `will-change` dropped | Fixed |
| 21 | LOW | Mobile | `app/globals.css`, `app/layout.tsx` | No tap-highlight reset, no `text-size-adjust`, no `touch-action: manipulation` on controls, Android keyboard did not resize the layout | Baseline from `mobile-native` added (see below) | Fixed |

### Required format — Before | After | Why

| Before | After | Why |
| --- | --- | --- |
| `gsap.fromTo(brackets, { scale: 0.55 }, { duration: 0.45, ease: "back.out(2.2)" })` | `{ scale: 0.9 } → { scale: 1, duration: 0.2, ease: "power3.out" }` | Fires on every card change incl. arrow keys; a bounce there feels slow and noisy |
| `group-hover:scale-110 duration-500` (event banner) | `group-hover:scale-105 duration-250` | Tens-per-day hover; UI stays under 300ms |
| `hover:-translate-y-1.5 hover:scale-[1.02] duration-300`, no `:active` | `… duration-200 active:scale-[0.99] active:duration-150` | Pressable cards must answer the press; hovers stay short |
| Detail panel `400ms` in and out | `400ms` in, `200ms` out | Asymmetric: arrive gently, leave fast |
| `transition-[width] duration-500` on a static progress bar | no transition | Delete before optimising; `width` is a layout property |
| `.about-card:hover { … }` at `0.4s` | same rules inside `@media (hover: hover) and (pointer: fine)`, `0.2s` | Taps fire false hovers on touch; shorter hover |
| `transition-colors duration-500` (announcement card) | `duration-200` | Hover colour changes should be quick |
| drawer `transition-transform duration-300` (default curve) | `ease-[cubic-bezier(0.32,0.72,0,1)]`, `duration-300` open / `duration-200` close | iOS drawer curve; exit faster than enter |
| `transform 560ms` card flip | `transform 480ms` | Trim a rare-but-repeated flip without changing its documented curve |
| bubble `scale(0)` → stepped | `scale(0.6)` + opacity → stepped | Nothing appears from nothing |
| `transition-all` | `transition-colors` / exact list | Never animate unintended properties |
| `"opacity 700ms cubic-bezier(0.16, 1, 0.3, 1) …"` + permanent `will-change` | `var(--ease-out-quart)`, no `will-change` | One token per curve; don't hold a layer forever |
| `<motion.div initial={{ opacity: 0, y }} whileInView …>` | IO flag → `transition-[opacity,translate] duration-500 ease-(--ease-out-quart)` | Off the main thread, no library for one fade |
| `setHeroProgress(v)` every frame | `el.style.transform/opacity/filter = …` | Zero React renders during the entrance |
| `text-[10px]` search input | `text-base md:text-[10px]` | iOS zooms into inputs under 16px |
| pixel-cell rings + pixel loader ring | stroked solid-line rings, pen-line loader with lapping head | Requested; arc-length pacing keeps the head's speed even at the ellipse tips |
| route change cuts | `<ViewTransition>` morph + rise, 420ms morph / 160ms exit / 280ms enter | Spatial continuity from the strip to the card it opens |

### Verdict

1. **Feel-breaking regressions** — the dead planet links (#1), the splash in front of every form (#3), the bounce on every card change (#4), and the iOS input zoom (#6). All fixed.
2. **Missed simplifications** — the progress-bar transition (#9) deleted; framer-motion (#16) deleted.
3. **Performance** — per-frame React renders in the hero (#2), `transition-all` (#19), `width` animation (#9). Fixed. Off-screen rAF loops are handled in the performance pass (`docs/SECURITY.md` lists the rest of Task 6).
4. **Interruptibility & timing** — symmetric detail panels (#8) and drawer (#13) made asymmetric.
5. **Origin, physicality & cohesion** — `scale(0)` bubble (#18), card press feedback (#7), token reuse (#20).
6. **Accessibility** — ungated hover (#10), orbit reduced-motion path (#14), view transitions get their own reduced-motion block (the global reset does not reach `::view-transition-*`).

**Decision: Approve** once the findings above are applied (they are), with the accepted items below.

## Accepted on purpose (not changed)

- **Recruitment popup entrance** (`RecruitmentPopup.tsx:118–150`): stepped CRT power-on with an overshoot to 1.06 and a `scale(0.5)` start. Shown once per visitor — the "rare / first-time → can add delight" row. Stepping makes the low start read as 8-bit, not "from nothing".
- **Header nav reveal at 700ms** (`V2Header.tsx:141`): plays once per load, as part of the hero entrance (marketing/explanatory budget).
- **Boot splash, wordmark decode, hero entrance**: rare, signature motion, documented in the codebase.
- **`transform-origin: center` on `PixelModal`**: modals are exempt.
- **The global `!important` reduced-motion reset**: documented in AGENTS.md as deliberate. It removes opacity transitions too (the skill prefers "gentler, not zero"); left as is by project rule.
- **No press scale on coverflow cards**: their `transform` is owned by the coverflow engine; a CSS `:active` scale would fight it.
- **`viewport-fit=cover`**: not added. It would put the sticky header under the notch in landscape unless every fixed element gains `env(safe-area-inset-*)` padding — a design change, not a fix.
- **`overscroll-behavior: none`**: not added; this is a scrolling document where pull-to-refresh is welcome (the skill's own exception).

## Missed opportunities (additive)

- Strip → recruitment form hand-off (now a view transition, #15).
- Solid-line orbit that draws itself on the loading screen, with an evenly paced pen head (requested).

## Mobile-native baseline added

```css
html { -webkit-tap-highlight-color: transparent; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
button, [role="button"] { touch-action: manipulation; user-select: none; }
a { touch-action: manipulation; }
```

`viewport.interactiveWidget = "resizes-content"` in `app/layout.tsx`. Inputs are 16px on phones (`8bit-input` already was; search inputs fixed in #6).

**Needs a phone:** the tap-highlight, the input-zoom fix and the drawer curve were checked in code and in desktop Chromium. Confirm them on a real iPhone and Android device; the skill says emulation doesn't count.
