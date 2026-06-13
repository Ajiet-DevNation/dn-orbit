"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Progress } from "@/components/ui/8bit-progress";
import { cn } from "@/lib/utils";

// ─── Configuration ───────────────────────────────────────────────────────────

/** Size of each "pixel block" in the draw animation (larger = blockier) */
const BLOCK_SIZE = 18;

/** How many blocks to reveal per animation frame */
const BLOCKS_PER_FRAME = 20;

/** Canvas render size — the logo is drawn into this square */
const CANVAS_SIZE = 900;

/** Duration of the logo pop animation (ms) */
const POP_DURATION_MS = 600;

/** Delay after pop before orbit starts (ms) */
const POST_POP_DELAY_MS = 200;

/** Duration of the fade-in for the orbit ring (ms) */
const ORBIT_FADE_IN_MS = 800;

/** Orbital period for each planet icon (ms) */
const ORBIT_PERIODS = {
  github: 6000,
  leetcode: 8000,
  linkedin: 10000,
} as const;

/** Orbit radii (semi-major and semi-minor for the ellipse) */
const ORBIT_RX = 410;
const ORBIT_RY = 135;

/** Size of each orbiting planet icon */
const PLANET_ICON_SIZE = 40;

/** The tilt of the orbit ring */
const ORBIT_TILT = -Math.PI / 6;

// ─── SVG Icon Paths ──────────────────────────────────────────────────────────

function GitHubIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]"
    >
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function LeetCodeIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]"
    >
      <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z" />
    </svg>
  );
}

function LinkedInIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface PixelBlock {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Animation phases:
 *  1. drawing   — logo draws in block by block
 *  2. popping   — logo scales up with a spring-bounce "pop" (hero mode only)
 *  3. orbiting  — orbit ring + planet icons fade in (hero mode only)
 */
type AnimationPhase = "drawing" | "popping" | "orbiting";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract non-transparent pixel blocks from the logo image data.
 * Samples the image at BLOCK_SIZE intervals and collects blocks
 * that have meaningful alpha (> 30), then shuffles them for the
 * "constructing" effect via Fisher-Yates shuffle.
 */
function extractPixelBlocks(imageData: ImageData): PixelBlock[] {
  const blocks: PixelBlock[] = [];
  const { data, width } = imageData;

  for (let y = 0; y < imageData.height; y += BLOCK_SIZE) {
    for (let x = 0; x < width; x += BLOCK_SIZE) {
      const sampleX = Math.min(x + Math.floor(BLOCK_SIZE / 2), width - 1);
      const sampleY = Math.min(
        y + Math.floor(BLOCK_SIZE / 2),
        imageData.height - 1
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

  // Fisher-Yates shuffle for random reveal order
  // Use a seeded or consistent approach if we want the exact same blocks
  // to draw across unmounts, but the user won't notice a slight reshuffle
  // for the remaining blocks.
  for (let i = blocks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
  }

  return blocks;
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface PixelLoadingScreenProps {
  mode?: "loading" | "hero";
}

export function PixelLoadingScreen({ mode = "loading" }: PixelLoadingScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<AnimationPhase>("drawing");
  const [drawProgress, setDrawProgress] = useState(mode === "hero" ? 100 : 0);
  const [popActive, setPopActive] = useState(mode === "hero");
  const [orbitVisible, setOrbitVisible] = useState(false);
  const animFrameRef = useRef<number>(0);
  const totalBlocksRef = useRef<number>(1);

  // ── Phase 1: Pixel-by-pixel logo drawing ──────────────────────────────────

  const drawLogo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.src = "/assets/DNLogoTransparent.png";

    img.onload = () => {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Offscreen canvas for pixel sampling
      const offscreen = document.createElement("canvas");
      offscreen.width = CANVAS_SIZE;
      offscreen.height = CANVAS_SIZE;
      const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
      if (!offCtx) return;

      // Centre the logo, maintaining aspect ratio
      const scale = Math.min(
        CANVAS_SIZE / img.naturalWidth,
        CANVAS_SIZE / img.naturalHeight
      );
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const offsetX = (CANVAS_SIZE - drawW) / 2;
      const offsetY = (CANVAS_SIZE - drawH) / 2;

      offCtx.imageSmoothingEnabled = false;
      offCtx.drawImage(img, offsetX, offsetY, drawW, drawH);

      // If we are in hero mode, we instantly draw the full blocky image 
      // and trigger the pop transition!
      if (mode === "hero") {
        const imageData = offCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        const blocks = extractPixelBlocks(imageData);

        ctx.imageSmoothingEnabled = false;
        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i];
          ctx.fillStyle = `rgba(${block.r}, ${block.g}, ${block.b}, ${block.a / 255})`;
          ctx.fillRect(block.x, block.y, BLOCK_SIZE, BLOCK_SIZE);
        }

        setDrawProgress(100);
        setTimeout(() => {
          setPhase("popping");
          setPopActive(true);
        }, 100);
        return;
      }

      const imageData = offCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      const blocks = extractPixelBlocks(imageData);

      ctx.imageSmoothingEnabled = false;

      let currentBlock = 0;

      // Initial fast-forward draw for everything up to currentBlock
      if (currentBlock > 0 && currentBlock < blocks.length) {
        for (let i = 0; i < currentBlock; i++) {
          const block = blocks[i];
          ctx.fillStyle = `rgba(${block.r}, ${block.g}, ${block.b}, ${block.a / 255})`;
          ctx.fillRect(block.x, block.y, BLOCK_SIZE, BLOCK_SIZE);
        }
      }

      const animate = () => {
        if (currentBlock >= blocks.length) {
          setDrawProgress(100);
          // Just wait here at 100% until unmounted
          return;
        }

        const end = Math.min(currentBlock + BLOCKS_PER_FRAME, blocks.length);
        for (let i = currentBlock; i < end; i++) {
          const block = blocks[i];
          ctx.fillStyle = `rgba(${block.r}, ${block.g}, ${block.b}, ${block.a / 255})`;
          ctx.fillRect(block.x, block.y, BLOCK_SIZE, BLOCK_SIZE);
        }

        currentBlock = end;
        
        try {
          sessionStorage.setItem("dn-orbit-draw-progress", currentBlock.toString());
        } catch {}

        const raw = Math.floor((currentBlock / totalBlocksRef.current) * 100);
        setDrawProgress(Math.floor(raw / 5) * 5);
        animFrameRef.current = requestAnimationFrame(animate);
      };

      setTimeout(() => {
        animFrameRef.current = requestAnimationFrame(animate);
      }, 200);
    };

    img.onerror = () => {
      // Fallback: skip to orbit phase
      setPhase("orbiting");
      setOrbitVisible(true);
    };
  }, [mode]);

  useEffect(() => {
    drawLogo();
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [drawLogo]);

  // ── Phase 2→3: Pop → Orbit (chained timers) ────────────

  useEffect(() => {
    if (phase !== "popping") return;

    // After pop animation completes → start orbit
    const orbitTimer = setTimeout(() => {
      setPhase("orbiting");
      // Small stagger before orbit elements fade in
      setTimeout(() => {
        setOrbitVisible(true);
        // Inform the layout to reveal the main V2Header
        window.dispatchEvent(new Event("hero-reveal-header"));
      }, 50);
    }, POP_DURATION_MS + POST_POP_DELAY_MS);

    return () => clearTimeout(orbitTimer);
  }, [phase]);

  // ── Orbit ring drawing (canvas-based for the dashed ellipse) ──────────────

  const orbitCanvasBackRef = useRef<HTMLCanvasElement>(null);
  const orbitCanvasFrontRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (phase !== "orbiting") return;

    const backCanvas = orbitCanvasBackRef.current;
    const frontCanvas = orbitCanvasFrontRef.current;
    if (!backCanvas || !frontCanvas) return;

    let frame: number;

    const drawOrbitRing = () => {
      const w = backCanvas.width;
      const h = backCanvas.height;
      const cx = w / 2;
      const cy = h / 2;

      const drawSaturnRing = (ctx: CanvasRenderingContext2D, isBack: boolean) => {
        const startAngle = isBack ? Math.PI : 0;
        const endAngle = isBack ? 2 * Math.PI : Math.PI;
        
        ctx.save();
        // Glow effect
        ctx.shadowColor = "rgba(34, 197, 94, 0.8)";
        ctx.shadowBlur = 15;

        // Main thick energy ring
        ctx.beginPath();
        ctx.ellipse(cx, cy, ORBIT_RX, ORBIT_RY, ORBIT_TILT, startAngle, endAngle);
        ctx.strokeStyle = `rgba(34, 197, 94, ${isBack ? 0.2 : 0.4})`;
        ctx.lineWidth = 4;
        ctx.setLineDash([]); // Solid ring, not dashed
        ctx.stroke();

        // Inner core of the energy ring (brighter)
        ctx.beginPath();
        ctx.ellipse(cx, cy, ORBIT_RX, ORBIT_RY, ORBIT_TILT, startAngle, endAngle);
        ctx.strokeStyle = `rgba(255, 255, 255, ${isBack ? 0.1 : 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
      };

      const bctx = backCanvas.getContext("2d");
      if (bctx) {
        bctx.clearRect(0, 0, w, h);
        drawSaturnRing(bctx, true);
      }

      const fctx = frontCanvas.getContext("2d");
      if (fctx) {
        fctx.clearRect(0, 0, w, h);
        drawSaturnRing(fctx, false);
      }

      frame = requestAnimationFrame(drawOrbitRing);
    };

    frame = requestAnimationFrame(drawOrbitRing);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  // ── Planet position calculator (rAF-driven for jank-free rotation) ────────

  const [planetPositions, setPlanetPositions] = useState({
    github: { x: 0, y: 0, scale: 1, z: 0 },
    leetcode: { x: 0, y: 0, scale: 1, z: 0 },
    linkedin: { x: 0, y: 0, scale: 1, z: 0 },
  });

  useEffect(() => {
    if (phase !== "orbiting") return;

    const start = performance.now();
    let frame: number;

    const updatePositions = (now: number) => {
      const elapsed = now - start;

      const calcPos = (period: number, offset: number) => {
        const angle =
          ((elapsed / period) * Math.PI * 2 + offset) % (Math.PI * 2);
        const unX = ORBIT_RX * Math.cos(angle);
        const unY = ORBIT_RY * Math.sin(angle);
        const x = unX * Math.cos(ORBIT_TILT) - unY * Math.sin(ORBIT_TILT);
        const y = unX * Math.sin(ORBIT_TILT) + unY * Math.cos(ORBIT_TILT);
        const z = Math.sin(angle);
        const scale = 0.7 + 0.3 * ((z + 1) / 2);
        return { x, y, scale, z };
      };

      setPlanetPositions({
        github: calcPos(ORBIT_PERIODS.github, 0),
        leetcode: calcPos(ORBIT_PERIODS.leetcode, (Math.PI * 2) / 3),
        linkedin: calcPos(ORBIT_PERIODS.linkedin, (Math.PI * 4) / 3),
      });

      frame = requestAnimationFrame(updatePositions);
    };

    frame = requestAnimationFrame(updatePositions);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  // ── Computed values ───────────────────────────────────────────────────────

  
  const showOrbit = phase === "orbiting";
  const showProgress = phase === "drawing";

  // Logo pop scale: starts at 1, bounces to 1.15, settles at 1.08
  // The CSS transition handles the spring-like feel via cubic-bezier
  const logoScale =
    phase === "drawing"
      ? 1
      : popActive
        ? 1.08
        : 1;

  // Render logic differs slightly based on mode
  const wrapperClass =
    mode === "loading"
      ? "fixed inset-0 z-[100] flex items-center justify-center bg-bg/95 backdrop-blur-sm"
      : "relative flex min-h-[70vh] w-full items-center justify-center overflow-hidden";

  return (
    <div className={wrapperClass}>
      {/* 
        In Hero mode, the landing page is instantly loaded. No dark overlay needed.
      */}

      {/* Scanline overlay for 8-bit feel */}
      <div
        className="pointer-events-none absolute inset-0 z-[60] opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)",
          backgroundSize: "100% 4px",
        }}
      />

      {/* Dot grid pattern (subtle) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle, #333333 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Subtle sophisticated central glow */}
      <div
        className="pointer-events-none absolute inset-0 z-[5] opacity-40"
        style={{
          background: "radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 60%)",
        }}
      />

      {/* ── Central animation area ── */}
      <div className="relative z-10 flex w-full max-w-[700px] flex-col items-center">
        {/* ── 3D Container ── */}
        <div className="relative w-full aspect-square flex items-center justify-center">
          
          {/* Back Orbit Ring (z-0) */}
          {showOrbit && (
            <canvas
              ref={orbitCanvasBackRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="absolute inset-0 z-0 w-full h-full pointer-events-none"
              style={{
                opacity: orbitVisible ? 1 : 0,
                transition: `opacity ${ORBIT_FADE_IN_MS}ms ease-out`,
              }}
            />
          )}

          {/* Logo (z-10) */}
          <div
            className="absolute inset-0 z-10 flex items-center justify-center"
            style={{
              transform: `scale(${logoScale})`,
              transition:
                phase === "popping" || phase === "orbiting"
                  ? `transform ${POP_DURATION_MS}ms cubic-bezier(0.175, 0.885, 0.32, 1.275)`
                  : "none",
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

          {/* Front Orbit Ring (z-20) */}
          {showOrbit && (
            <canvas
              ref={orbitCanvasFrontRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="absolute inset-0 z-20 w-full h-full pointer-events-none"
              style={{
                opacity: orbitVisible ? 1 : 0,
                transition: `opacity ${ORBIT_FADE_IN_MS}ms ease-out`,
              }}
            />
          )}

          {/* Planets (Siblings with dynamic z-index to cross the logo) */}
          {showOrbit && (
            <>
              {/* GitHub */}
              <div
                className="absolute flex items-center justify-center rounded-full force-rounded-full overflow-hidden border-2 border-transparent pointer-events-none"
                style={{
                  backgroundColor: "#181717",
                  width: PLANET_ICON_SIZE,
                  height: PLANET_ICON_SIZE,
                  left: `calc(50% + ${(planetPositions.github.x / CANVAS_SIZE) * 100}%)`,
                  top: `calc(50% + ${(planetPositions.github.y / CANVAS_SIZE) * 100}%)`,
                  transform: `translate(-50%, -50%) scale(${planetPositions.github.scale})`,
                  zIndex: planetPositions.github.z > 0 ? 30 : 5,
                  opacity: orbitVisible ? (0.6 + 0.4 * ((planetPositions.github.z + 1) / 2)) : 0,
                  transition: `opacity ${ORBIT_FADE_IN_MS}ms ease-out`,
                }}
              >
                <GitHubIcon size={PLANET_ICON_SIZE * 0.6} />
              </div>

              {/* LeetCode */}
              <div
                className="absolute flex items-center justify-center rounded-full force-rounded-full overflow-hidden border-2 border-transparent pointer-events-none"
                style={{
                  backgroundColor: "#FFA116",
                  width: PLANET_ICON_SIZE,
                  height: PLANET_ICON_SIZE,
                  left: `calc(50% + ${(planetPositions.leetcode.x / CANVAS_SIZE) * 100}%)`,
                  top: `calc(50% + ${(planetPositions.leetcode.y / CANVAS_SIZE) * 100}%)`,
                  transform: `translate(-50%, -50%) scale(${planetPositions.leetcode.scale})`,
                  zIndex: planetPositions.leetcode.z > 0 ? 30 : 5,
                  opacity: orbitVisible ? (0.6 + 0.4 * ((planetPositions.leetcode.z + 1) / 2)) : 0,
                  transition: `opacity ${ORBIT_FADE_IN_MS}ms ease-out`,
                }}
              >
                <LeetCodeIcon size={PLANET_ICON_SIZE * 0.55} />
              </div>

              {/* LinkedIn */}
              <div
                className="absolute flex items-center justify-center rounded-full force-rounded-full overflow-hidden border-2 border-transparent pointer-events-none"
                style={{
                  backgroundColor: "#0a66c2",
                  width: PLANET_ICON_SIZE,
                  height: PLANET_ICON_SIZE,
                  left: `calc(50% + ${(planetPositions.linkedin.x / CANVAS_SIZE) * 100}%)`,
                  top: `calc(50% + ${(planetPositions.linkedin.y / CANVAS_SIZE) * 100}%)`,
                  transform: `translate(-50%, -50%) scale(${planetPositions.linkedin.scale})`,
                  zIndex: planetPositions.linkedin.z > 0 ? 30 : 5,
                  opacity: orbitVisible ? (0.6 + 0.4 * ((planetPositions.linkedin.z + 1) / 2)) : 0,
                  transition: `opacity ${ORBIT_FADE_IN_MS}ms ease-out`,
                }}
              >
                <LinkedInIcon size={PLANET_ICON_SIZE * 0.55} />
              </div>
            </>
          )}
        </div>

        {/* ── 8-Bit Loading Bar + Status Text ── */}
        <div
          className={cn(
            "mt-8 flex w-full max-w-xs flex-col items-center gap-4 retro",
            "dark"
          )}
          style={{
            // Fade out the progress bar once the pop starts
            opacity: showProgress ? 1 : 0,
            transform: showProgress ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 400ms ease-out, transform 400ms ease-out",
            // Prevent interaction after hidden
            pointerEvents: showProgress ? "auto" : "none",
          }}
        >
          <p
            className="text-[10px] uppercase tracking-widest text-accent"
            style={{
              animation: "pixel-pulse 1.5s step-end infinite",
              textShadow: "0 0 8px rgba(34, 197, 94, 0.4)",
            }}
          >
            LOADING...
          </p>

          {/* 8-bit retro progress bar */}
          <div className="w-full space-y-1">
            <div className="flex justify-end">
              <span className="text-[8px] text-text-muted">
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

      {/* ── Keyframe Animations ── */}
      <style>{`
        @keyframes pixel-pulse {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
