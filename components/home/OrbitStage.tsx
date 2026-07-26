"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/8bit-progress";
import {
  CANVAS_SIZE,
  easeOutCubic,
  FLING_THRESHOLD,
  ORBIT_RX,
  ORBIT_RY,
  ORBIT_TILT,
  type OrbitPosition,
  orbitPositions,
  PLANET_ICON_SIZE,
  PLANET_KEYS,
  type PlanetKey,
  reformProgressAt,
  reformSpinBoost,
  ringRevealAt,
  settleSpin,
  shatterPhaseAt,
  shatterVelocity,
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
const ORBIT_FADE_IN_MS = 800;

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
    href: "https://www.linkedin.com/company/devnationajiet/",
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
  const hasShatteredRef = useRef(false);

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
  const [flashActive, setFlashActive] = useState(false);

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
  const reducedMotionRef = useRef(false);
  useEffect(() => {
    reducedMotionRef.current =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, []);

  // ── Synthetic Audio Generator (Web Audio API) ─────────────────────────────

  const playFlashSound = useCallback(() => {
    if (typeof window === "undefined") return;
    // Respect reduced-motion: skip the synthesized audio "flash".
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    try {
      const AudioContext =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof window.AudioContext;
          }
        ).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      // 1. High energy sweep (The "Flash")
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(1200, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.8);
      gain1.gain.setValueAtTime(0, ctx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 1);

      // 2. Deep bass impact (The "Lock")
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "square"; // Adds that retro 8-bit grit!
      osc2.frequency.setValueAtTime(150, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.6);
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start();
      osc2.stop(ctx.currentTime + 1);
    } catch {
      // Silently fail if browser blocks autoplay (no unused 'e' parameter)
    }
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
  }, [mode, runTween]);

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

  // ── Second, counter-rotating ring ──────────────────────────────────────────
  //
  // A wider ellipse at a different inclination, giving the orbit real depth
  // instead of one flat hoop.
  //
  // Deliberately its own canvas, painted ONCE on mount and then spun with a CSS
  // transform. The main ring's draw loop is carefully cached so it only
  // re-strokes when something actually changed (a shadowBlur'd ellipse every
  // frame is expensive); a genuinely animated second ring would have thrown
  // that away. Rotating a already-painted canvas is compositor-only — the
  // pixels are never re-rasterised.
  const outerRingRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (phase !== "orbiting") return;
    const canvas = outerRingRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;

    // Wider, flatter, tilted the other way so the two rings cross.
    ctx.beginPath();
    ctx.ellipse(
      cx,
      cy,
      ORBIT_RX * 1.16,
      ORBIT_RY * 0.62,
      -ORBIT_TILT * 1.5,
      0,
      Math.PI * 2,
    );
    ctx.strokeStyle = "rgba(34, 197, 94, 0.14)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Chunky dust motes along the path — pixel squares, not a smooth band, so
    // it reads 8-bit. Deterministic positions (no Math.random) so the ring is
    // identical on every mount.
    const MOTES = 46;
    for (let i = 0; i < MOTES; i++) {
      const a = (i / MOTES) * Math.PI * 2;
      const ux = ORBIT_RX * 1.16 * Math.cos(a);
      const uy = ORBIT_RY * 0.62 * Math.sin(a);
      const t = -ORBIT_TILT * 1.5;
      const x = ux * Math.cos(t) - uy * Math.sin(t);
      const y = ux * Math.sin(t) + uy * Math.cos(t);
      // Vary size/alpha with a cheap deterministic hash of the index.
      const jitter = ((i * 2654435761) % 100) / 100;
      const size = 2 + Math.round(jitter * 2) * 2;
      ctx.fillStyle = `rgba(34, 197, 94, ${0.1 + jitter * 0.22})`;
      ctx.fillRect(
        Math.round((cx + x) / 4) * 4,
        Math.round((cy + y) / 4) * 4,
        size,
        size,
      );
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "orbiting") return;

    const backCanvas = orbitCanvasBackRef.current;
    const frontCanvas = orbitCanvasFrontRef.current;
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

      // Nothing visibly changed since the last stroke → don't touch the canvas.
      if (
        ringOpacity === lastOpacity &&
        ringScale === lastScale &&
        !trailsAlive &&
        !lastTrailsAlive
      ) {
        frame = requestAnimationFrame(drawOrbitRing);
        return;
      }
      lastOpacity = ringOpacity;
      lastScale = ringScale;
      lastTrailsAlive = trailsAlive;

      const bctx = backCanvas.getContext("2d");
      const fctx = frontCanvas.getContext("2d");

      // ── Saturn ring, split front/back around the logo ───────────────────────
      //
      // The two halves are drawn onto two canvases that sandwich the logo (back
      // at z-0, logo at z-10, front at z-20), so the near half genuinely passes
      // OVER the glyph and the far half behind it. The geometry always did that
      // — at the logo's horizontal centre the front arc sits ~153 canvas units
      // down, well inside the glyph's 229 half-height — but it read as "the
      // ring is entirely behind the logo", because the near half was stroked at
      // 45% green with a 32% white highlight, and neither is visible against a
      // pure-white logo.
      //
      // The fix is contrast, not geometry:
      //
      //   • The near half gets a dark casing stroked underneath a bright core.
      //     That's what real ring imagery looks like crossing a lit body, and
      //     it's what separates the ring from BOTH the black background and the
      //     white glyph. Without the casing the arc simply dissolves on white.
      //   • The near half is near-opaque; the far half stays dim and thin, so
      //     the two halves read as different distances rather than one flat
      //     ellipse.
      //   • The glow is only applied to the near half. On the far half it just
      //     bled green over the logo's edges and muddied the silhouette.
      const strokeArc = (
        ctx: CanvasRenderingContext2D,
        isBack: boolean,
        color: string,
        width: number,
      ) => {
        ctx.beginPath();
        ctx.ellipse(
          cx,
          cy,
          ORBIT_RX,
          ORBIT_RY,
          ORBIT_TILT,
          isBack ? Math.PI : 0,
          isBack ? 2 * Math.PI : Math.PI,
        );
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
      };

      const drawSaturnRing = (
        ctx: CanvasRenderingContext2D,
        isBack: boolean,
      ) => {
        ctx.save();

        ctx.translate(cx, cy);
        ctx.scale(ringScale, ringScale);
        ctx.translate(-cx, -cy);

        if (isBack) {
          // Far half: thin, dim, no glow. It should read as "behind", and
          // anything brighter competes with the near half.
          ctx.shadowBlur = 0;
          strokeArc(ctx, true, `rgba(34, 197, 94, ${0.3 * ringOpacity})`, 3);
          strokeArc(
            ctx,
            true,
            `rgba(255, 255, 255, ${0.1 * ringOpacity})`,
            1.25,
          );
          ctx.restore();
          return;
        }

        // Near half. Casing first — a dark, wider stroke that reads as the
        // ring's shadowed underside and gives the bright core an edge to sit
        // against wherever it crosses the logo.
        ctx.shadowBlur = 0;
        strokeArc(ctx, false, `rgba(4, 12, 8, ${0.72 * ringOpacity})`, 11);

        // Bright core, with the glow applied only here.
        ctx.shadowColor = `rgba(34, 197, 94, ${0.9 * ringOpacity})`;
        ctx.shadowBlur = 16;
        strokeArc(ctx, false, `rgba(34, 197, 94, ${0.95 * ringOpacity})`, 5.5);

        // Specular highlight along the top of the near half.
        ctx.shadowBlur = 0;
        strokeArc(
          ctx,
          false,
          `rgba(214, 255, 231, ${0.75 * ringOpacity})`,
          1.75,
        );

        ctx.restore();
      };

      // Ghost squares, split across the two canvases so a trail laid on the far
      // side of the ring stays behind the logo, like the planets themselves.
      // Deliberately NOT scaled by ringOpacity: during the shatter beat the
      // ring fades out but the flung planets (and their trails) stay visible.
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
            ctx.fillRect(
              snapToGrid(cx + p.x, TRAIL_CELL) - size / 2,
              snapToGrid(cy + p.y, TRAIL_CELL) - size / 2,
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
  }, [phase]);

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
    for (const key of PLANET_KEYS) {
      const el = planetElsRef.current[key];
      if (!el) continue;
      const p = planetPositionsRef.current[key];

      el.style.transform = `translate3d(${p.x * k}px, ${p.y * k}px, 0) scale(${p.scale})`;

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

    // Counter-rotate the outer ring: opposite direction, much slower, so the two
    // rings drift against each other. Transform-only.
    const outer = outerRingRef.current;
    if (outer) {
      const deg = -(physics.current.accumulatedTime / 260) % 360;
      outer.style.transform = `rotate(${deg}deg) scale(${0.94 + 0.06 * reveal})`;
      outer.style.opacity = String(reveal * 0.9);
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
    if (phase !== "orbiting") return;

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
          phys.isShattered = false;
          setShattered(false);
          planetPositionsRef.current = targetPositions;

          setFlashActive(true);
          playFlashSound();
          setTimeout(() => setFlashActive(false), 50);
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
  }, [phase, playFlashSound, paintPlanets]);

  // ── Drag & Shatter Interaction Handlers ─────────────────────────────────────

  const triggerShatter = useCallback(() => {
    const phys = physics.current;
    phys.isShattered = true;
    phys.shatterStartTime = performance.now();
    hasShatteredRef.current = true;
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

      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle, #333333 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 z-[5] opacity-40"
        style={{
          background:
            "radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 60%)",
        }}
      />

      {/* ── Reforming Flash Effect ── */}
      <div
        className="pointer-events-none absolute inset-0 z-[80] flex items-center justify-center"
        style={{
          transform: `translateY(${contentOffsetY}px)`,
          opacity: flashActive ? 1 : 0,
          transition: flashActive
            ? "none"
            : "opacity 1.5s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div
          className="w-[800px] h-[300px] rounded-[100%]"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255,255,255,1) 0%, rgba(34,197,94,0.6) 30%, transparent 70%)",
            transform: `rotate(${ORBIT_TILT}rad) scale(${flashActive ? 0.5 : 1.2})`,
            transition: flashActive
              ? "none"
              : "transform 1.5s cubic-bezier(0.16, 1, 0.3, 1)",
            filter: "blur(20px)",
            mixBlendMode: "screen",
          }}
        />
      </div>

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
          {/* Outer counter-rotating ring + dust. Painted once, spun by CSS
              transform in paintPlanets — sits furthest back. */}
          {showOrbit && (
            <canvas
              ref={outerRingRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
              style={{ opacity: 0, willChange: "transform" }}
            />
          )}

          {showOrbit && (
            <canvas
              ref={orbitCanvasBackRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="absolute inset-0 z-0 w-full h-full pointer-events-none"
              style={{
                opacity: orbitReveal,
                transform: `scale(${orbitRingScale})`,
                transition: orbitRevealTransition,
              }}
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

          {showOrbit && (
            <canvas
              ref={orbitCanvasFrontRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="absolute inset-0 z-20 w-full h-full pointer-events-none"
              style={{
                opacity: orbitReveal,
                transform: `scale(${orbitRingScale})`,
                transition: orbitRevealTransition,
              }}
            />
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
            transition: "all 600ms cubic-bezier(0.16, 1, 0.3, 1)",
            pointerEvents: showProgress ? "auto" : "none",
          }}
        >
          <p className="text-[10px] uppercase tracking-widest text-accent pixel-pulse-text">
            LOADING...
          </p>

          <div className="w-full space-y-1">
            <div className="flex justify-end">
              <span className="text-[8px] tabular-nums text-text-muted">
                {drawProgress}%
              </span>
            </div>
            <Progress
              value={drawProgress}
              variant="retro"
              progressBg="bg-accent"
              className="h-4"
            />
          </div>
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
          text-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
        }
      `,
        }}
      />
    </div>
  );
}
