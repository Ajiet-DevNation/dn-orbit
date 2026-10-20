"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PixelStarfield } from "@/components/ui/PixelStarfield";
import { markLoaderDrawn } from "@/lib/boot-splash";
import {
  CANVAS_SIZE,
  easeOutCubic,
  FLING_THRESHOLD,
  LOADER_RING_CELLS,
  loaderRingCells,
  ORBIT_RX,
  ORBIT_RY,
  ORBIT_TILT,
  type OrbitPosition,
  orbitPositions,
  PLANET_ICON_SIZE,
  PLANET_KEYS,
  type PlanetKey,
  type RingCell,
  reformProgressAt,
  reformSpinBoost,
  ringCells,
  ringRevealAt,
  settleSpin,
  shatterPhaseAt,
  shatterVelocity,
  spinPoint,
  stepReform,
  stepScatter,
} from "@/lib/orbit-engine";
import {
  shouldEmit,
  snapToGrid,
  TRAIL_MAX_AGE_MS,
  TRAIL_MAX_PARTICLES,
  type TrailParticle,
  trailAlpha,
  trailSize,
} from "@/lib/orbit-trail";
import { cn } from "@/lib/utils";

// ─── Configuration ───────────────────────────────────────────────────────────
// Geometry, orbit timing and the shatter physics live in lib/orbit-engine so
// they can be unit-tested without a DOM. What's left here is presentation.

const BLOCK_SIZE = 18;
const BLOCKS_PER_FRAME = 20;
/** Loading ring: pixel grid it snaps to, and the square drawn per cell. */
const LOADER_CELL = 9;
const LOADER_DOT = 9;
/** Landing rings, as pixel cells. Main = the planets' ring; outer = the
 *  fainter, wider plane drifting against it. */
const MAIN_RING = { count: 120, cell: 9, dot: 9 } as const;
const OUTER_RING = { count: 150, cell: 6, dot: 5 } as const;
/** Re-plot the rings once the spin has moved them this far (rad). */
const RING_REDRAW_RAD = 0.0015;

// Paint one half of a pixel ring: a soft square glow under each cell, the cell
// itself, and on the near half a small white core so it reads as lit.
function paintRingCells(
  ctx: CanvasRenderingContext2D,
  cells: RingCell[],
  dot: number,
  alpha: number,
  core: boolean,
) {
  const half = dot / 2;
  const glow = dot * 2;
  ctx.fillStyle = `rgba(139, 92, 246, ${0.14 * alpha})`;
  for (const c of cells)
    ctx.fillRect(c.x - glow / 2, c.y - glow / 2, glow, glow);
  ctx.fillStyle = `rgba(139, 92, 246, ${alpha})`;
  for (const c of cells) ctx.fillRect(c.x - half, c.y - half, dot, dot);
  if (!core) return;
  const k = Math.max(2, Math.round(dot / 3));
  ctx.fillStyle = `rgba(255, 255, 255, ${0.55 * alpha})`;
  for (const c of cells) ctx.fillRect(c.x - k / 2, c.y - k / 2, k, k);
}

/** How long the loading ring takes to draw itself round, once the logo is in. */
const LOADER_DRAW_MS = 950;
/** Once formed, a bright pixel laps the loading ring this often (ms). */
const LOADER_LAP_MS = 1800;
const ORBIT_FADE_IN_MS = 800;

// Tumble of the whole ring system, in radians per ms at the resting spin (1x).
// ~90s for a full turn: present enough to read as alive, slow enough that it
// never competes with the planets travelling the ring.
const RING_SPIN_RATE = (Math.PI * 2) / 90_000;
// The outer plane counter-rotates at a fraction of that, so the two cross at a
// changing angle rather than moving as one rigid object.
const OUTER_SPIN_RATIO = 0.55;
// A fling can drive spinVelocity very high; bound its contribution so the rings
// accelerate noticeably without whipping round.
const MAX_SPIN_FACTOR = 6;

// Resting scale of the freshly-drawn logo. The loading screen draws and holds
// the logo at this size; the landing-page hero then picks it up from exactly
// here and grows it to full size (1.0) as the orbit forms — so the loading→
// landing hand-off reads as one continuous "draw → come alive → grow → orbit"
// motion rather than a size jump. Keep both modes pinned to this constant.
const HERO_START_SCALE = 0.7;

// Base upward nudge applied to the logo/orbit cluster (matches the old
// `-translate-y-20`). Shared by both modes so the internal layout is identical.
const LOGO_BASE_OFFSET_Y = -80;

// On the landing page the hero is pushed down by the sticky V2Header. The
// loading overlay is a full-viewport fixed layer with no header, so its logo
// would sit ~one header-height too high. Nudging the loading logo down by the
// header height lands it exactly where the hero logo settles — a seamless
// hand-off. Keep this in sync with the V2Header height (px-6 pt-6 pb-3 + ~64px
// logo ≈ 100px).
const HEADER_OFFSET = 100;

// ── 8-bit ghost trail ────────────────────────────────────────────────────────
// Chunky grid-snapped squares left behind whenever a planet moves meaningfully
// faster than its calm orbit — drag-flings, the shatter scatter, and the reform
// pull-in (see lib/orbit-trail.ts for the emission/decay math). Colors match
// each planet's brand glow.

const TRAIL_CELL = 8;
const TRAIL_COLORS: Record<PlanetKey, string> = {
  github: "163, 113, 247",
  leetcode: "255, 161, 22",
  linkedin: "56, 189, 248",
};

// ─── SVG Icon Paths ──────────────────────────────────────────────────────────

function GitHubIcon({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-[#a371f7] drop-shadow-[0_0_8px_rgba(163,113,247,0.8)]"
      aria-hidden="true"
    >
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function LeetCodeIcon({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-[#FFA116] drop-shadow-[0_0_8px_rgba(255,161,22,0.8)]"
      aria-hidden="true"
    >
      <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z" />
    </svg>
  );
}

function LinkedInIcon({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-[#38bdf8] drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]"
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

// The three orbiting links, in one place — the markup for these used to be
// three near-identical 30-line blocks differing only by icon, href and label.
const PLANETS: {
  key: PlanetKey;
  href: string;
  label: string;
  Icon: (props: { size: number }) => React.ReactElement;
  hoverScale: number;
}[] = [
  {
    key: "github",
    href: "https://github.com/Ajiet-DevNation",
    label: "DevNation on GitHub",
    Icon: GitHubIcon,
    hoverScale: 1.45,
  },
  {
    key: "leetcode",
    href: "https://leetcode.com/",
    label: "LeetCode",
    Icon: LeetCodeIcon,
    hoverScale: 1.45,
  },
  {
    key: "linkedin",
    href: "https://www.linkedin.com/company/devnationajiet/posts/?feedView=all",
    label: "DevNation on LinkedIn",
    Icon: LinkedInIcon,
    hoverScale: 1.7,
  },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface PixelBlock {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

type AnimationPhase = "drawing" | "orbiting";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractPixelBlocks(imageData: ImageData): PixelBlock[] {
  const blocks: PixelBlock[] = [];
  const { data, width } = imageData;

  for (let y = 0; y < imageData.height; y += BLOCK_SIZE) {
    for (let x = 0; x < width; x += BLOCK_SIZE) {
      const sampleX = Math.min(x + Math.floor(BLOCK_SIZE / 2), width - 1);
      const sampleY = Math.min(
        y + Math.floor(BLOCK_SIZE / 2),
        imageData.height - 1,
      );
      const idx = (sampleY * width + sampleX) * 4;

      const a = data[idx + 3];
      if (a > 30) {
        blocks.push({
          x,
          y,
          r: data[idx],
          g: data[idx + 1],
          b: data[idx + 2],
          a,
        });
      }
    }
  }

  for (let i = blocks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
  }

  return blocks;
}

// ─── Orbit stage ─────────────────────────────────────────────────────────────
//
// The shared visual: the pixel-drawn DN logo, the Saturn ring canvases, the
// three orbiting links and the physics that drives them. Two shells sit on top —
// HeroOrbit (landing page) and BootOverlay (loading splash) — and the ONLY
// difference between them is `mode`.
//
// Keeping one stage rather than two copies is what guarantees the boot → hero
// hand-off stays pixel-identical: HERO_START_SCALE, LOGO_BASE_OFFSET_Y and
// HEADER_OFFSET are applied here, once, so the logo cannot drift between them.

export interface OrbitStageProps {
  mode?: "loading" | "hero";
}

export function OrbitStage({ mode = "loading" }: OrbitStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<AnimationPhase>("drawing");
  const [drawProgress, setDrawProgress] = useState(mode === "hero" ? 100 : 0);
  const [orbitVisible, setOrbitVisible] = useState(false);
  // Hero-only entrance, driven by JS (rAF) rather than CSS transitions. This is
  // deliberate: the global `prefers-reduced-motion` rule in globals.css forces
  // every CSS transition/animation to ~0ms, which would make a CSS-based reveal
  // snap in instantly. A JS-interpolated value is immune to that rule, so the
  // hand-off stays smooth for every visitor. `heroProgress` eases the logo in;
  // `orbitProgress` eases the orbit + planets in a beat later (staggered).
  const [heroProgress, setHeroProgress] = useState(mode === "hero" ? 0 : 1);
  const [orbitProgress, setOrbitProgress] = useState(mode === "hero" ? 0 : 1);
  const heroAnimRef = useRef<number>(0);
  const orbitAnimRef = useRef<number>(0);

  // Directly tied into the JSX to prevent unused variable linter errors
  const [isMounted, setIsMounted] = useState(false);

  const isMountedRef = useRef(true);
  const animFrameRef = useRef<number>(0);
  const isPausedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    const timer = setTimeout(() => setIsMounted(true), 10);
    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
    };
  }, []);

  // Custom Deep-Space Physics Engine State
  const physics = useRef({
    accumulatedTime: 0,
    spinVelocity: 1,
    isDragging: false,
    lastMouseY: 0,
    isShattered: false,
    shatterStartTime: 0,
    particles: {
      github: { x: 0, y: 0, vx: 0, vy: 0, scale: 1, z: 0 },
      leetcode: { x: 0, y: 0, vx: 0, vy: 0, scale: 1, z: 0 },
      linkedin: { x: 0, y: 0, vx: 0, vy: 0, scale: 1, z: 0 },
    },
  });

  const [shattered, setShattered] = useState(false);

  // Trail state lives in refs — the physics rAF writes it, the ring-canvas rAF
  // reads it, and React never needs to re-render for a particle.
  const trailsRef = useRef<Record<PlanetKey, TrailParticle[]>>({
    github: [],
    leetcode: [],
    linkedin: [],
  });
  const lastTrailPosRef = useRef<
    Record<PlanetKey, { x: number; y: number } | null>
  >({ github: null, leetcode: null, linkedin: null });
  // Decorative motion: honor prefers-reduced-motion by simply never emitting.
  // The orbit's physics and ring loops pause while the stage is off screen —
  // they used to run every frame for the page's whole life, competing with the
  // lens sections' scroll animation far below.
  const [onScreen, setOnScreen] = useState(true);
  const reducedMotionRef = useRef(false);
  useEffect(() => {
    reducedMotionRef.current =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, []);

  // ── JS-driven tween (immune to reduced-motion CSS) ─────────────────────────
  // Eases `setValue` from 0→1 over `durationMs` using easeOutCubic, storing the
  // rAF handle in `frameRef` so it can be cancelled on unmount. We animate in JS
  // (not CSS) so the global prefers-reduced-motion reset can't flatten it.

  const runTween = useCallback(
    (
      durationMs: number,
      setValue: (v: number) => void,
      frameRef: React.MutableRefObject<number>,
    ) => {
      const start = performance.now();
      const tick = (now: number) => {
        if (!isMountedRef.current) return;
        const t = Math.min(1, (now - start) / durationMs);
        setValue(easeOutCubic(t));
        if (t < 1) {
          frameRef.current = requestAnimationFrame(tick);
        }
      };
      frameRef.current = requestAnimationFrame(tick);
    },
    [],
  );

  // ── Loading ring: a purple pixel orbit that forms as the logo draws ───────
  // Two canvases sandwich the logo like the hero rings (far half behind, near
  // half in front), so it reads as an orbit wrapping the DN, not a halo.

  const loaderBackRef = useRef<HTMLCanvasElement>(null);
  const loaderFrontRef = useRef<HTMLCanvasElement>(null);

  // `head` = index of the brightest cell (the leading edge while forming, the
  // lapping pixel once complete); the two cells behind it glow a little too.
  const paintLoaderRing = useCallback((progress: number, head: number) => {
    const back = loaderBackRef.current?.getContext("2d");
    const front = loaderFrontRef.current?.getContext("2d");
    if (!back || !front) return;
    back.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    front.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const cells = loaderRingCells(progress, LOADER_CELL);
    const half = LOADER_DOT / 2;
    cells.forEach((c, i) => {
      const ctx = c.front ? front : back;
      const lag = (head - i + LOADER_RING_CELLS) % LOADER_RING_CELLS;
      if (lag === 0) {
        ctx.fillStyle = "#ede9fe";
        ctx.shadowColor = "rgba(196, 181, 253, 0.95)";
        ctx.shadowBlur = 18;
      } else if (lag <= 2) {
        ctx.fillStyle = "#c4b5fd";
        ctx.shadowColor = "rgba(167, 139, 250, 0.8)";
        ctx.shadowBlur = 12;
      } else {
        // The far half is dimmer, like the hero rings, to sell the depth.
        ctx.fillStyle = c.front
          ? "rgba(139, 92, 246, 0.95)"
          : "rgba(139, 92, 246, 0.5)";
        ctx.shadowColor = "rgba(139, 92, 246, 0.6)";
        ctx.shadowBlur = c.front ? 8 : 4;
      }
      ctx.fillRect(c.x - half, c.y - half, LOADER_DOT, LOADER_DOT);
    });
  }, []);

  // ── Phase 1: Pixel-by-pixel logo drawing ──────────────────────────────────

  const drawLogo = useCallback(() => {
    const img = new Image();

    img.onload = () => {
      if (!isMountedRef.current) return;

      const offscreen = document.createElement("canvas");
      offscreen.width = CANVAS_SIZE;
      offscreen.height = CANVAS_SIZE;
      const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
      if (!offCtx) return;

      const scale = Math.min(
        CANVAS_SIZE / img.naturalWidth,
        CANVAS_SIZE / img.naturalHeight,
      );
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const offsetX = (CANVAS_SIZE - drawW) / 2;
      const offsetY = (CANVAS_SIZE - drawH) / 2;

      offCtx.imageSmoothingEnabled = false;
      offCtx.drawImage(img, offsetX, offsetY, drawW, drawH);

      const imageData = offCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      const blocks = extractPixelBlocks(imageData);

      if (mode === "hero") {
        const ctx = canvasRef.current?.getContext("2d", {
          willReadFrequently: true,
        });
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            ctx.fillStyle = `rgba(${block.r}, ${block.g}, ${block.b}, ${block.a / 255})`;
            ctx.fillRect(block.x, block.y, BLOCK_SIZE, BLOCK_SIZE);
          }
        }
        setDrawProgress(100);
        // Smooth, JS-driven reveal. The logo eases in first (fade + gentle
        // grow + de-blur); the orbit follows a beat later for a staggered,
        // cohesive hand-off from the loading overlay rather than a hard cut.
        runTween(1100, setHeroProgress, heroAnimRef);
        setTimeout(() => {
          if (!isMountedRef.current) return;
          setPhase("orbiting");
          runTween(1300, setOrbitProgress, orbitAnimRef);
        }, 480);
        return;
      }

      let currentBlock = 0;

      const animate = () => {
        if (!isMountedRef.current) return;

        if (currentBlock >= blocks.length) {
          // Loading is "draw only": the logo finishes pixel-painting and simply
          // rests at HERO_START_SCALE. The grow + orbit reveal belongs to the
          // landing page (hero mode), so the hand-off is one continuous motion.
          setDrawProgress(100);
          if (reducedMotionRef.current) {
            paintLoaderRing(1, LOADER_RING_CELLS - 1);
            markLoaderDrawn();
            return;
          }
          // Logo in: now the orbit draws itself round it like a pen line, a
          // bright head leading; then that head keeps lapping the ring.
          const drawStart = performance.now();
          let lastHead = -2;
          const lap = (now: number) => {
            if (!isMountedRef.current) return;
            const t = (now - drawStart) / LOADER_DRAW_MS;
            let progress = 1;
            let head: number;
            if (t < 1) {
              progress = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
              head = Math.round(progress * LOADER_RING_CELLS) - 1;
            } else {
              markLoaderDrawn();
              head =
                (LOADER_RING_CELLS -
                  1 +
                  Math.floor(
                    ((now - drawStart - LOADER_DRAW_MS) / LOADER_LAP_MS) *
                      LOADER_RING_CELLS,
                  )) %
                LOADER_RING_CELLS;
            }
            if (head !== lastHead || t < 1) {
              paintLoaderRing(progress, head);
              lastHead = head;
            }
            animFrameRef.current = requestAnimationFrame(lap);
          };
          animFrameRef.current = requestAnimationFrame(lap);
          return;
        }

        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d", {
            willReadFrequently: true,
          });
          if (ctx) {
            ctx.imageSmoothingEnabled = false;
            const end = Math.min(
              currentBlock + BLOCKS_PER_FRAME,
              blocks.length,
            );
            for (let i = currentBlock; i < end; i++) {
              const block = blocks[i];
              ctx.fillStyle = `rgba(${block.r}, ${block.g}, ${block.b}, ${block.a / 255})`;
              ctx.fillRect(block.x, block.y, BLOCK_SIZE, BLOCK_SIZE);
            }
            currentBlock = end;
          }
        }

        const raw = Math.floor(
          (currentBlock / Math.max(blocks.length, 1)) * 100,
        );
        setDrawProgress(Math.floor(raw / 5) * 5);
        animFrameRef.current = requestAnimationFrame(animate);
      };

      setTimeout(() => {
        if (isMountedRef.current) {
          animFrameRef.current = requestAnimationFrame(animate);
        }
      }, 200);
    };

    img.onerror = () => {
      if (!isMountedRef.current) return;
      setPhase("orbiting");
      setOrbitVisible(true);
    };

    img.src = "/assets/DNLogoTransparent.png";
  }, [mode, runTween, paintLoaderRing]);

  useEffect(() => {
    drawLogo();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      // The hero/orbit tweens self-terminate via the isMountedRef guard in their
      // tick (no further setState or rescheduling once unmounted), so they don't
      // need explicit cancellation here.
    };
  }, [drawLogo]);

  // ── Orbit reveal: announce the header once the orbit begins forming ────────

  useEffect(() => {
    if (phase !== "orbiting" || orbitVisible) return;

    const visibleTimer = setTimeout(() => {
      setOrbitVisible(true);
      window.dispatchEvent(new Event("hero-reveal-header"));
    }, 50);

    return () => clearTimeout(visibleTimer);
  }, [phase, orbitVisible]);

  // ── Orbit ring drawing ────────────────────────────────────────────────────

  const orbitCanvasBackRef = useRef<HTMLCanvasElement>(null);
  const orbitCanvasFrontRef = useRef<HTMLCanvasElement>(null);

  // The second, wider orbital plane gets its OWN pair of canvases rather than
  // sharing the main ring's, so the two planes can spin at different rates.
  // Both pairs sandwich the logo the same way (far half behind, near half in
  // front), which is what makes each read as an orbit rather than a decoration.
  const outerCanvasBackRef = useRef<HTMLCanvasElement>(null);
  const outerCanvasFrontRef = useRef<HTMLCanvasElement>(null);

  // The rings spin about the view axis by `ringAngleRef`. They are re-plotted
  // as pixel cells at the current angle (lib/orbit-engine ringCells) rather
  // than by rotating a painted canvas, so each cell stays a crisp, upright
  // square. Spinning about the view axis leaves depth alone, so a cell's
  // near/far half — and with it which canvas it is painted on — never changes.
  const ringAngleRef = useRef(0);

  useEffect(() => {
    if (phase !== "orbiting" || !onScreen) return;

    const backCanvas = orbitCanvasBackRef.current;
    const frontCanvas = orbitCanvasFrontRef.current;
    const outerBackCanvas = outerCanvasBackRef.current;
    const outerFrontCanvas = outerCanvasFrontRef.current;
    if (!backCanvas || !frontCanvas) return;

    let frame: number;
    // The ring is a *static* ellipse — only the planets move along it. So during
    // idle its pixels never change, yet the old loop re-stroked it (with an
    // expensive shadowBlur) on every frame. We now cache the last drawn
    // opacity/scale and skip the redraw when nothing changed, which frees the
    // main thread for buttery planet motion. It only actually re-strokes during
    // the shatter/reform beat (when opacity & scale animate).
    let lastOpacity = Number.NaN;
    let lastScale = Number.NaN;
    // Trails invalidate the cache too: redraw every frame while any particle is
    // alive, plus one final frame after the last one expires to clear it.
    let lastTrailsAlive = false;
    let lastAngle = Number.NaN;

    const drawOrbitRing = () => {
      const w = backCanvas.width;
      const h = backCanvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const phys = physics.current;
      const now = performance.now();

      let ringOpacity = 1;
      let ringScale = 1;

      if (phys.isShattered) {
        const reveal = ringRevealAt(now - phys.shatterStartTime);
        ringOpacity = reveal.opacity;
        ringScale = reveal.scale;
      }

      // Drop expired trail particles once per frame (buffers are append-only,
      // so the oldest particle sits at index 0).
      for (const k of PLANET_KEYS) {
        const buf = trailsRef.current[k];
        if (buf.length && now - buf[0].bornAt >= TRAIL_MAX_AGE_MS) {
          trailsRef.current[k] = buf.filter(
            (p) => now - p.bornAt < TRAIL_MAX_AGE_MS,
          );
        }
      }
      const trailsAlive = PLANET_KEYS.some(
        (k) => trailsRef.current[k].length > 0,
      );

      // The rings spin in maths (so their pixels stay square), which means a
      // redraw whenever the spin has moved them; otherwise skip the canvas.
      const angle = ringAngleRef.current;
      if (
        ringOpacity === lastOpacity &&
        ringScale === lastScale &&
        Math.abs(angle - lastAngle) < RING_REDRAW_RAD &&
        !trailsAlive &&
        !lastTrailsAlive
      ) {
        frame = requestAnimationFrame(drawOrbitRing);
        return;
      }
      lastOpacity = ringOpacity;
      lastScale = ringScale;
      lastAngle = angle;
      lastTrailsAlive = trailsAlive;

      const main = ringCells({
        rx: ORBIT_RX,
        ry: ORBIT_RY,
        tilt: ORBIT_TILT + angle,
        count: MAIN_RING.count,
        cell: MAIN_RING.cell,
        scale: ringScale,
      });
      // Opposite direction and slower, so the two planes drift against each
      // other instead of moving as one rigid object.
      const outer = ringCells({
        rx: ORBIT_RX * 1.16,
        ry: ORBIT_RY * 0.62,
        tilt: -ORBIT_TILT * 1.5 - angle * OUTER_SPIN_RATIO,
        count: OUTER_RING.count,
        cell: OUTER_RING.cell,
      });
      const obctx = outerBackCanvas?.getContext("2d");
      const ofctx = outerFrontCanvas?.getContext("2d");
      if (obctx && ofctx) {
        obctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ofctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        // Faint by design: the far plane must not compete with the planets'.
        paintRingCells(
          obctx,
          outer.filter((c) => !c.front),
          OUTER_RING.dot,
          0.16,
          false,
        );
        paintRingCells(
          ofctx,
          outer.filter((c) => c.front),
          OUTER_RING.dot,
          0.42,
          false,
        );
      }

      const bctx = backCanvas.getContext("2d");
      const fctx = frontCanvas.getContext("2d");

      const drawSaturnRing = (ctx: CanvasRenderingContext2D, isBack: boolean) =>
        paintRingCells(
          ctx,
          main.filter((c) => c.front !== isBack),
          MAIN_RING.dot,
          (isBack ? 0.5 : 0.95) * ringOpacity,
          !isBack,
        );

      // Ghost squares, split across the two canvases so a trail laid on the far
      // side of the ring stays behind the logo, like the planets themselves.
      // Deliberately NOT scaled by ringOpacity: during the shatter beat the
      // ring fades out but the flung planets (and their trails) stay visible.
      // Trail points are stored in the ring's own frame (like the planets'
      // physics positions), so turn them by the current spin exactly as
      // paintPlanets turns the planets; otherwise a trail lags off its planet.
      const drawTrails = (ctx: CanvasRenderingContext2D, isBack: boolean) => {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        for (const k of PLANET_KEYS) {
          for (const p of trailsRef.current[k]) {
            if (p.back !== isBack) continue;
            const age = now - p.bornAt;
            const alpha = trailAlpha(age);
            if (alpha <= 0) continue;
            const size = trailSize(age, TRAIL_CELL);
            ctx.fillStyle = `rgba(${TRAIL_COLORS[k]}, ${alpha})`;
            const at = spinPoint(p.x, p.y, angle);
            ctx.fillRect(
              snapToGrid(cx + at.x, TRAIL_CELL) - size / 2,
              snapToGrid(cy + at.y, TRAIL_CELL) - size / 2,
              size,
              size,
            );
          }
        }
        ctx.restore();
      };

      if (bctx) {
        bctx.clearRect(0, 0, w, h);
        if (ringOpacity > 0) drawSaturnRing(bctx, true);
        drawTrails(bctx, true);
      }

      if (fctx) {
        fctx.clearRect(0, 0, w, h);
        if (ringOpacity > 0) drawSaturnRing(fctx, false);
        drawTrails(fctx, false);
      }

      frame = requestAnimationFrame(drawOrbitRing);
    };

    frame = requestAnimationFrame(drawOrbitRing);
    return () => cancelAnimationFrame(frame);
  }, [phase, onScreen]);

  // ── Physics Position Calculator ────────────────────────────────────────────

  // Planet positions live in a ref and are written straight to the DOM.
  //
  // They used to be React state updated on EVERY rAF tick, which re-rendered
  // this entire component ~60x/second for as long as the hero was mounted — and
  // each planet was positioned with `left`/`top` as calc() strings, which are
  // layout-triggering properties, so every one of those frames also forced a
  // reflow. Now the elements are statically centred with margins and only their
  // `transform` (compositor-only) changes per frame. Zero renders while
  // orbiting.
  const planetPositionsRef = useRef<Record<PlanetKey, OrbitPosition>>({
    github: { x: 0, y: 0, scale: 1, z: 0 },
    leetcode: { x: 0, y: 0, scale: 1, z: 0 },
    linkedin: { x: 0, y: 0, scale: 1, z: 0 },
  });
  const planetElsRef = useRef<Record<PlanetKey, HTMLDivElement | null>>({
    github: null,
    leetcode: null,
    linkedin: null,
  });
  // Canvas units → CSS px. The stage is square and scales with the viewport, so
  // this is remeasured on resize rather than assumed.
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) =>
      setOnScreen(entry.isIntersecting),
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const scaleFactorRef = useRef(1);
  // Last written z-index / opacity per planet — both force a style recalc, so
  // they're only touched when the rounded value actually changes.
  const lastZIndexRef = useRef<Record<PlanetKey, number>>({
    github: 0,
    leetcode: 0,
    linkedin: 0,
  });
  const lastOpacityRef = useRef<Record<PlanetKey, number>>({
    github: -1,
    leetcode: -1,
    linkedin: -1,
  });
  const lastGlowRef = useRef<Record<PlanetKey, number>>({
    github: -1,
    leetcode: -1,
    linkedin: -1,
  });
  // Read by the paint function; kept in a ref so the physics loop never needs
  // to be torn down and restarted when the reveal tween advances.
  const orbitRevealRef = useRef(mode === "hero" ? 0 : 1);

  const paintPlanets = useCallback(() => {
    const k = scaleFactorRef.current;
    const reveal = orbitRevealRef.current;

    // The whole ring system tumbles about the view axis. Rotating about the
    // axis pointing at the viewer changes x and y but leaves DEPTH alone, which
    // is why the planets can be spun here while their z — and therefore their
    // front/behind ordering against the logo — stays exactly as the physics
    // computed it. Spin the ring canvases by the same angle and the planets
    // stay locked to their ring at every orientation.
    const angle = ringAngleRef.current;

    for (const key of PLANET_KEYS) {
      const el = planetElsRef.current[key];
      if (!el) continue;
      const p = planetPositionsRef.current[key];
      const at = spinPoint(p.x, p.y, angle);

      el.style.transform = `translate3d(${at.x * k}px, ${at.y * k}px, 0) scale(${p.scale})`;

      const z = p.z > 0 ? 30 : 5;
      if (lastZIndexRef.current[key] !== z) {
        el.style.zIndex = String(z);
        lastZIndexRef.current[key] = z;
      }

      // Depth-faded: planets on the far side of the ring dim.
      const opacity =
        Math.round(reveal * (0.6 + 0.4 * ((p.z + 1) / 2)) * 100) / 100;
      if (lastOpacityRef.current[key] !== opacity) {
        el.style.opacity = String(opacity);
        lastOpacityRef.current[key] = opacity;
      }

      // Brand halo that swells as the planet swings to the FRONT of the ring
      // and fades as it goes behind. A pre-rendered gradient cross-faded by
      // opacity, so it costs nothing per frame — animating a filter/box-shadow
      // here would be paint-bound.
      const glow = el.firstElementChild as HTMLElement | null;
      if (glow) {
        const g = Math.round(Math.max(0, p.z) * reveal * 100) / 100;
        if (lastGlowRef.current[key] !== g) {
          glow.style.opacity = String(g);
          lastGlowRef.current[key] = g;
        }
      }
    }
  }, []);

  // Keep the canvas-unit → px factor correct across resizes.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      scaleFactorRef.current = stage.clientWidth / CANVAS_SIZE;
      paintPlanets();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [paintPlanets]);

  // Repaint when the entrance tween advances the reveal, so the planets fade in
  // even before the physics loop starts writing every frame.
  useEffect(() => {
    paintPlanets();
  });

  useEffect(() => {
    if (phase !== "orbiting" || !onScreen) return;

    let lastTime = performance.now();
    let frame: number;

    const updatePositions = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      const phys = physics.current;

      if (!phys.isDragging && (!isPausedRef.current || phys.isShattered)) {
        phys.spinVelocity = settleSpin(phys.spinVelocity, delta);
        let currentSpin = phys.spinVelocity;
        if (phys.isShattered) {
          currentSpin += reformSpinBoost(now - phys.shatterStartTime);
        }
        phys.accumulatedTime += delta * currentSpin;
      }

      const targetPositions = orbitPositions(phys.accumulatedTime);

      if (phys.isShattered) {
        const elapsed = now - phys.shatterStartTime;
        const stage = shatterPhaseAt(elapsed);

        if (stage === "done") {
          // The planets simply resume their orbit. There is deliberately no
          // audio and no flash burst on re-lock — the motion itself reads as
          // the resolution.
          phys.isShattered = false;
          setShattered(false);
          planetPositionsRef.current = targetPositions;
        } else {
          const reform = reformProgressAt(elapsed);
          PLANET_KEYS.forEach((k, index) => {
            const p = phys.particles[k];
            if (stage === "scatter") {
              stepScatter(p, elapsed, now, index);
            } else {
              stepReform(p, targetPositions[k], reform);
            }
          });
          planetPositionsRef.current = phys.particles;
        }
      } else {
        planetPositionsRef.current = targetPositions;
      }

      // Advance the system's tumble. Tied to the current spin (bounded) so a
      // drag or fling visibly accelerates the rings, not just the planets.
      const spinFactor = Math.max(
        -MAX_SPIN_FACTOR,
        Math.min(MAX_SPIN_FACTOR, phys.spinVelocity),
      );
      ringAngleRef.current += delta * RING_SPIN_RATE * spinFactor;

      // Compositor-only DOM write — no React render.
      paintPlanets();

      // Trail emission — a planet leaves ghost blocks only while moving
      // meaningfully faster than the calm orbit, which naturally covers the
      // drag-fling, the shatter scatter, and the reform pull-in.
      const current = phys.isShattered ? phys.particles : targetPositions;
      if (!reducedMotionRef.current) {
        for (const k of PLANET_KEYS) {
          const pos = current[k];
          const last = lastTrailPosRef.current[k];
          if (
            last &&
            shouldEmit(Math.hypot(pos.x - last.x, pos.y - last.y), delta)
          ) {
            const buf = trailsRef.current[k];
            buf.push({ x: pos.x, y: pos.y, bornAt: now, back: pos.z <= 0 });
            if (buf.length > TRAIL_MAX_PARTICLES) buf.shift();
          }
          lastTrailPosRef.current[k] = { x: pos.x, y: pos.y };
        }
      }

      frame = requestAnimationFrame(updatePositions);
    };

    frame = requestAnimationFrame(updatePositions);
    return () => cancelAnimationFrame(frame);
  }, [phase, paintPlanets, onScreen]);

  // ── Drag & Shatter Interaction Handlers ─────────────────────────────────────

  const triggerShatter = useCallback(() => {
    const phys = physics.current;
    phys.isShattered = true;
    phys.shatterStartTime = performance.now();
    setShattered(true);

    for (const k of PLANET_KEYS) {
      const pos = planetPositionsRef.current[k];
      phys.particles[k] = {
        x: pos.x,
        y: pos.y,
        scale: pos.scale,
        z: pos.z,
        ...shatterVelocity(pos, phys.spinVelocity),
      };
    }
    planetPositionsRef.current = phys.particles;
  }, []);

  // ── Pointer (not mouse) events ─────────────────────────────────────────────
  // These were onMouseDown/Move/Up, which fire only for a real mouse. The
  // drag-to-spin and fling-to-shatter interaction — the whole reason the hero is
  // interactive — was therefore completely dead on phones and tablets. Pointer
  // events cover mouse, touch and pen with one path.

  const handlePointerDown = (e: React.PointerEvent) => {
    if (physics.current.isShattered || phase !== "orbiting") return;
    // A press on a planet is a link click, not a drag. Capturing it here
    // retargets pointerup/click to the stage, so the link never opened.
    if ((e.target as Element).closest("a")) return;
    physics.current.isDragging = true;
    physics.current.lastMouseY = e.clientY;
    physics.current.spinVelocity = 0;
    // Capture so the gesture keeps tracking if the finger leaves the element.
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (
      !physics.current.isDragging ||
      physics.current.isShattered ||
      phase !== "orbiting"
    )
      return;

    const deltaY = e.clientY - physics.current.lastMouseY;
    physics.current.lastMouseY = e.clientY;

    // The orbit follows the pointer 1:1 (responsive), but the fling velocity is
    // a low-pass average of the recent motion rather than the last jittery frame
    // — so releasing reflects the gesture's true speed and the fling feels
    // smooth instead of snapping to whatever the final event happened to be.
    physics.current.accumulatedTime -= deltaY * 30;
    physics.current.spinVelocity =
      physics.current.spinVelocity * 0.6 + -deltaY * 0.4;
  };

  const handlePointerUp = (e?: React.PointerEvent) => {
    if (!physics.current.isDragging || physics.current.isShattered) return;
    physics.current.isDragging = false;
    if (e) e.currentTarget.releasePointerCapture?.(e.pointerId);

    if (Math.abs(physics.current.spinVelocity) > FLING_THRESHOLD) {
      triggerShatter();
    } else {
      physics.current.spinVelocity *= 0.8;
      if (Math.abs(physics.current.spinVelocity) < 1) {
        physics.current.spinVelocity = 1;
      }
    }
  };

  // ── Computed values ───────────────────────────────────────────────────────

  const showOrbit = phase === "orbiting";
  // The progress bar is a loading affordance only — the landing-page hero must
  // never flash "LOADING…" while its entrance plays out.
  const showProgress = mode !== "hero" && phase === "drawing";

  // ── Hero reveal multipliers (JS-driven; see heroProgress/orbitProgress) ──
  // For the landing-page hero these come from the rAF tweens, so the entrance
  // stays smooth even under prefers-reduced-motion. Loading mode keeps its
  // original CSS-transition behaviour keyed off `orbitVisible`.
  const isHero = mode === "hero";
  const orbitReveal = isHero ? orbitProgress : orbitVisible ? 1 : 0;
  // The planets' opacity is written by the rAF loop (not React), so hand the
  // current reveal value across through a ref and repaint on change.
  orbitRevealRef.current = orbitReveal;
  const orbitRingScale = isHero
    ? 0.86 + 0.14 * orbitProgress
    : orbitVisible
      ? 1
      : 0.82;
  // JS drives the hero values per frame, so CSS transitions are disabled there
  // (and would be flattened by reduced-motion anyway). Loading mode keeps them.
  const orbitRevealTransition = isHero
    ? "none"
    : shattered
      ? "none"
      : `opacity ${ORBIT_FADE_IN_MS}ms ease-out, transform ${ORBIT_FADE_IN_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
  const planetRevealTransition = isHero
    ? "none"
    : shattered
      ? "none"
      : `opacity ${ORBIT_FADE_IN_MS}ms ease-out`;

  const wrapperClass =
    mode === "loading"
      ? // Fully opaque: a translucent + backdrop-blurred bg let the landing
        // hero logo behind the overlay bleed through as a soft white halo.
        "fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-bg"
      : "relative flex min-h-[100vh] w-full items-center justify-center overflow-hidden";

  // Loading overlay has no header, so push its logo down by the header height to
  // align with where the hero logo lands once the header is present.
  const contentOffsetY =
    mode === "loading"
      ? LOGO_BASE_OFFSET_Y + HEADER_OFFSET
      : LOGO_BASE_OFFSET_Y;

  return (
    <div className={wrapperClass}>
      <div
        className="pointer-events-none absolute inset-0 z-[60] opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)",
          backgroundSize: "100% 4px",
        }}
      />

      {/* The page's own starfield shows through behind the hero; the
          opaque loading overlay draws its own so the two match. */}
      {mode === "loading" && <PixelStarfield className="z-0" />}

      <div
        className="pointer-events-none absolute inset-0 z-[5] opacity-40"
        style={{
          background:
            "radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 60%)",
        }}
      />

      <div
        className="relative z-10 flex w-full max-w-[700px] flex-col items-center"
        style={{ transform: `translateY(${contentOffsetY}px)` }}
      >
        <div
          ref={stageRef}
          // A plain container, deliberately. It carried role="application" plus
          // a tabIndex and a keydown handler that only called preventDefault() —
          // so it took a tab stop, told screen readers to route every keystroke
          // into it, and then did nothing with them.
          //
          // Not aria-hidden either: the three planets inside are real links and
          // must stay in the accessibility tree. They are keyboard-reachable on
          // their own, which is the whole of the useful interaction here; the
          // drag-to-spin is a pointer enhancement on top of that.
          className={cn(
            "relative w-full aspect-square flex items-center justify-center",
            // touch-pan-y: keep vertical page scrolling working on phones while
            // the horizontal/vertical drag spins the orbit.
            "touch-pan-y",
            !shattered &&
              phase === "orbiting" &&
              "cursor-grab active:cursor-grabbing",
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Far halves, behind the logo. The canvases keep their React-owned
              entrance scale/opacity; the spin is plotted into them. */}
          {showOrbit && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0"
            >
              <canvas
                ref={outerCanvasBackRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="absolute inset-0 h-full w-full"
                style={{
                  opacity: orbitReveal,
                  transform: `scale(${orbitRingScale})`,
                  transition: orbitRevealTransition,
                }}
              />
            </div>
          )}

          {showOrbit && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-[1]"
            >
              <canvas
                ref={orbitCanvasBackRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="absolute inset-0 h-full w-full"
                style={{
                  opacity: orbitReveal,
                  transform: `scale(${orbitRingScale})`,
                  transition: orbitRevealTransition,
                }}
              />
            </div>
          )}

          {mode === "loading" && (
            <canvas
              ref={loaderBackRef}
              aria-hidden
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
            />
          )}

          <div
            className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
            style={{
              // Hero grows from HERO_START_SCALE up to full size as it comes
              // alive. Loading rests at full size (1.0) — identical to the
              // landing hero's settled size — so the boot-splash → landing
              // hand-off has no size jump and reads as one continuous logo.
              transform: isHero
                ? `scale(${HERO_START_SCALE + (1 - HERO_START_SCALE) * heroProgress})`
                : `scale(1)`,
              // Fade + de-blur slightly ahead of the grow so it reads as the logo
              // "coming back to life" rather than a plain zoom.
              opacity: isHero ? Math.min(1, heroProgress * 1.3) : 1,
              filter: isHero ? `blur(${(1 - heroProgress) * 8}px)` : "none",
              transition: "none",
            }}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="block w-full h-full max-w-[700px] max-h-[700px]"
              style={{ imageRendering: "pixelated" }}
            />
          </div>

          {mode === "loading" && (
            <canvas
              ref={loaderFrontRef}
              aria-hidden
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="pointer-events-none absolute inset-0 z-[21] h-full w-full"
            />
          )}

          {/* Near halves — above the logo, so both planes visibly cross in
              front of it. */}
          {showOrbit && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20"
            >
              <canvas
                ref={outerCanvasFrontRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="absolute inset-0 h-full w-full"
                style={{
                  opacity: orbitReveal,
                  transform: `scale(${orbitRingScale})`,
                  transition: orbitRevealTransition,
                }}
              />
            </div>
          )}

          {showOrbit && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-[21]"
            >
              <canvas
                ref={orbitCanvasFrontRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="absolute inset-0 h-full w-full"
                style={{
                  opacity: orbitReveal,
                  transform: `scale(${orbitRingScale})`,
                  transition: orbitRevealTransition,
                }}
              />
            </div>
          )}

          {showOrbit &&
            PLANETS.map(({ key, href, label, Icon, hoverScale }) => (
              <div
                key={key}
                ref={(el) => {
                  planetElsRef.current[key] = el;
                }}
                className="absolute left-1/2 top-1/2 pointer-events-auto flex items-center justify-center"
                onPointerEnter={() => (isPausedRef.current = true)}
                onPointerLeave={() => (isPausedRef.current = false)}
                style={{
                  width: PLANET_ICON_SIZE,
                  height: PLANET_ICON_SIZE,
                  // Statically centred with margins so the per-frame write is
                  // a pure transform. `left`/`top` used to carry the position
                  // as calc() strings — layout-triggering, every frame.
                  marginLeft: -PLANET_ICON_SIZE / 2,
                  marginTop: -PLANET_ICON_SIZE / 2,
                  opacity: 0,
                  willChange: "transform",
                  transition: planetRevealTransition,
                }}
              >
                {/* Front-swing halo — opacity is driven per frame, the
                      gradient itself is static. Must stay the FIRST child;
                      paintPlanets finds it via firstElementChild. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -inset-6 -z-10"
                  style={{
                    opacity: 0,
                    background: `radial-gradient(circle, rgba(${TRAIL_COLORS[key]},0.45) 0%, transparent 68%)`,
                  }}
                />
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  className="flex h-full w-full cursor-pointer items-center justify-center transition-transform duration-300 ease-out"
                  style={{ ["--hover-scale" as string]: hoverScale }}
                  onPointerEnter={(e) => {
                    e.currentTarget.style.transform = `scale(${hoverScale})`;
                  }}
                  onPointerLeave={(e) => {
                    e.currentTarget.style.transform = "";
                  }}
                >
                  <Icon size={PLANET_ICON_SIZE * 0.85} />
                </a>
              </div>
            ))}
        </div>

        <div
          className={cn(
            "mt-8 flex w-full max-w-xs flex-col items-center gap-4 retro",
            "dark",
          )}
          style={{
            opacity: isMounted && showProgress ? 1 : 0,
            transform:
              isMounted && showProgress
                ? "translateY(0) scale(1)"
                : "translateY(16px) scale(0.95)",
            filter: isMounted && showProgress ? "blur(0)" : "blur(4px)",
            transition:
              "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1), filter 600ms cubic-bezier(0.16, 1, 0.3, 1)",
            pointerEvents: showProgress ? "auto" : "none",
          }}
        >
          <p
            role="status"
            className="text-[10px] uppercase tracking-widest text-brand-light"
          >
            <span className="pixel-pulse-text">LOADING</span>
            <span className="ml-3 tabular-nums text-white/50">
              {drawProgress}%
            </span>
          </p>
        </div>
      </div>

      <style
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static keyframe CSS string, no user input
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes pixel-pulse {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.3; }
        }
        .pixel-pulse-text {
          animation: pixel-pulse 1.5s step-end infinite;
          text-shadow: 0 0 8px rgba(139, 92, 246, 0.4);
        }
      `,
        }}
      />
    </div>
  );
}
