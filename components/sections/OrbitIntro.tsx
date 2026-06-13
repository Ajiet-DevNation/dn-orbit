"use client";


import { useEffect, useRef } from "react";
import { useAnimate, stagger } from "framer-motion";
import Image from "next/image";

/* ══════════════════════════════════════════════════════════════
   ORBITAL MATH ENGINE
   ══════════════════════════════════════════════════════════════ */

const DEG = Math.PI / 180;

interface RingDef {
  tiltDeg: number;        // tilt angle around horizontal axis
  rotateDeg: number;      // rotation in the screen plane
  radiusFraction: number; // fraction of container half-width
  speed: number;          // radians per second
  startAngle: number;     // initial angle offset (radians)
}

/**
 * 3 rings forming a classic atom structure:
 *   Ring 0: tilted 45°, rotated 45°  → angled right
 *   Ring 1: tilted 45°, rotated -45° → angled left (crosses Ring 0)
 *   Ring 2: tilted 85°, rotated 0°   → nearly horizontal
 *
 * Each has different speed to avoid synchronized repetition.
 */
const RINGS: RingDef[] = [
  { tiltDeg: 45, rotateDeg: 45, radiusFraction: 0.92, speed: 0.5, startAngle: 0 },
  { tiltDeg: 45, rotateDeg: -45, radiusFraction: 1.02, speed: 0.38, startAngle: 2.094 },
  { tiltDeg: 85, rotateDeg: 0, radiusFraction: 0.97, speed: 0.45, startAngle: 4.189 },
];

/**
 * Compute 2D projected position and visual depth of an orbital node.
 *
 * Math:
 *   1. Place point on a circle at angle θ: (r·cosθ, r·sinθ)
 *   2. Tilt the circle around the X-axis by tiltRad:
 *      - projY = sinθ · cos(tilt)
 *      - depth  = sinθ · sin(tilt)
 *   3. Rotate the projected ellipse in screen plane by rotateRad
 *   4. Map depth → scale (0.7–1.1), opacity (0.4–1.0), z-index (1 or 20)
 */
function computeNode(
  angle: number,
  radius: number,
  tiltRad: number,
  rotateRad: number,
) {
  const cx = radius * Math.cos(angle);
  const cy = radius * Math.sin(angle);

  // Tilt around X-axis
  const projY = cy * Math.cos(tiltRad);
  const depth = cy * Math.sin(tiltRad);

  // Rotate in screen plane
  const x = cx * Math.cos(rotateRad) - projY * Math.sin(rotateRad);
  const y = cx * Math.sin(rotateRad) + projY * Math.cos(rotateRad);

  // Normalize depth to [-1, 1]
  const maxZ = radius * Math.abs(Math.sin(tiltRad));
  const d = maxZ > 0 ? depth / maxZ : 0;

  // Visual properties based on depth
  const scale = 0.7 + (d + 1) * 0.2;     // 0.7 (back) → 1.1 (front)
  const opacity = 0.4 + (d + 1) * 0.3;   // 0.4 (back) → 1.0 (front)
  const zIndex = d > 0 ? 20 : 1;         // behind text or in front

  return { x, y, scale, opacity, zIndex };
}

/**
 * Compute the projected 2D ellipse from a tilted 3D circle.
 *   rx stays the same, ry = r × |cos(tilt)|
 */
function projectedEllipse(ring: RingDef, baseRadius: number) {
  const r = baseRadius * ring.radiusFraction;
  return {
    rx: r,
    ry: Math.abs(r * Math.cos(ring.tiltDeg * DEG)),
    rotate: ring.rotateDeg,
  };
}

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ══════════════════════════════════════════════════════════════ */

/** SVG wireframe globe — appears during Phase 1, dissolves in Phase 2 */
function CelestialSphere({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="100" cy="100" r="95" stroke="currentColor" strokeWidth="0.8" className="sphere-outer" opacity="0.6" />
      <g className="sphere-decay-lines">
        <ellipse cx="100" cy="100" rx="95" ry="15" stroke="currentColor" strokeWidth="0.4" opacity="0.15" />
        <ellipse cx="100" cy="100" rx="95" ry="35" stroke="currentColor" strokeWidth="0.4" opacity="0.2" />
        <ellipse cx="100" cy="100" rx="95" ry="65" stroke="currentColor" strokeWidth="0.4" opacity="0.15" />
        <ellipse cx="100" cy="100" rx="95" ry="85" stroke="currentColor" strokeWidth="0.3" opacity="0.1" />
        <ellipse cx="100" cy="100" rx="15" ry="95" stroke="currentColor" strokeWidth="0.4" opacity="0.15" />
        <ellipse cx="100" cy="100" rx="55" ry="95" stroke="currentColor" strokeWidth="0.4" opacity="0.15" />
        <ellipse cx="100" cy="100" rx="80" ry="95" stroke="currentColor" strokeWidth="0.3" opacity="0.1" />
        <ellipse cx="100" cy="100" rx="95" ry="3" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
        <line x1="100" y1="5" x2="100" y2="195" stroke="currentColor" strokeWidth="0.4" opacity="0.2" />
      </g>
      <g className="sphere-ring-lines">
        <ellipse cx="100" cy="100" rx="95" ry="45" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
        <ellipse cx="100" cy="100" rx="35" ry="95" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
        <ellipse cx="100" cy="100" rx="70" ry="95" stroke="currentColor" strokeWidth="0.6" opacity="0.3" transform="rotate(30 100 100)" />
      </g>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */

const PREMIUM_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * OrbitIntro — Cinematic brand intro with 3D Atomic Orbital System.
 *
 * Phase 1 (0→2.5s):  CelestialSphere fades in with slow rotation
 * Phase 2 (2.5→5s):  Sphere dissolves; ring + text system emerges
 * Phase 3 (5→6.5s):  "ORBIT" text reveals letter by letter
 * Phase 4 (6.5s+):   3D orbital nodes begin orbiting with depth illusion
 * Phase 5:           Join CTA + tagline fade in
 *
 * The orbital system uses requestAnimationFrame for 60fps node animation.
 * Nodes change scale (0.7→1.1), opacity (0.4→1.0), and z-index based
 * on their orbital depth relative to the text plane.
 */
export function OrbitIntro({ assets = [] }: { assets?: string[] }) {
  const [scope, animate] = useAnimate();
  const systemRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  // ── Intro animation timeline ──
  // No hasRun guard — uses cleanup-based cancellation instead,
  // which properly handles React Strict Mode double-invocations.
  useEffect(() => {
    let cancelled = false;

    const timeline = async () => {
      /* Phase 1: Sphere appears */
      animate(
        ".celestial-sphere",
        { opacity: 1, scale: 1 },
        { duration: 2.2, ease: PREMIUM_EASE }
      );
      animate(
        ".celestial-sphere",
        { rotate: 15 },
        { duration: 8, ease: "linear" }
      );
      await animate(
        ".phase-timer",
        { opacity: 1 },
        { duration: 2.5 }
      );
      if (cancelled) return;

      /* Phase 2: Sphere dissolves, orbital system emerges */
      animate(".sphere-decay-lines", { opacity: 0 }, { duration: 1.5, ease: "easeInOut" });
      animate(".sphere-ring-lines", { opacity: 0 }, { duration: 1.5, ease: "easeInOut" });
      animate(".sphere-outer", { opacity: 0 }, { duration: 1.5, ease: "easeInOut", delay: 0.5 });
      animate(".celestial-sphere", { scale: 0.28, opacity: 0 }, { duration: 2, ease: PREMIUM_EASE });

      // SVG ring paths fade in
      animate(
        ".orbital-ring-path",
        { opacity: 1 },
        { duration: 1.5, ease: "easeOut", delay: stagger(0.2, { startDelay: 0.5 }) }
      );

      await animate(".phase-timer", { opacity: 1 }, { duration: 2.5 });
      if (cancelled) return;

      /* Phase 3: Text reveal — "O" then "RBIT" */
      animate(".orbit-letter-O", { opacity: 1 }, { duration: 0.5, ease: PREMIUM_EASE });
      await animate(
        ".orbit-letter",
        { opacity: 1, x: 0, filter: "blur(0px)" },
        { duration: 0.8, ease: PREMIUM_EASE, delay: stagger(0.1, { startDelay: 0.15 }) }
      );
      if (cancelled) return;

      await animate(".phase-timer", { opacity: 1 }, { duration: 0.4 });
      if (cancelled) return;

      /* Phase 4: Nodes appear + Join CTA fades in */
      animate(
        ".orbital-node",
        { opacity: 1 },
        { duration: 1, ease: "easeOut", delay: stagger(0.15) }
      );
      animate(
        ".orbit-join-cta",
        { opacity: 1, y: 0 },
        { duration: 0.8, ease: PREMIUM_EASE, delay: 0.3 }
      );

      /* Phase 5: Tagline fades in below */
      animate(
        ".orbit-tagline",
        { opacity: 0.25 },
        { duration: 1.4, ease: "easeOut", delay: 0.5 }
      );
    };

    timeline();

    return () => {
      cancelled = true;
    };
  }, [animate]);

  // ── requestAnimationFrame orbital motion ──
  useEffect(() => {
    const startTime = performance.now();

    const tick = (time: number) => {
      const container = systemRef.current;
      const nodesEl = nodesRef.current;
      if (!container || !nodesEl) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const { width } = container.getBoundingClientRect();
      const baseRadius = width * 0.48;
      const elapsed = (time - startTime) / 1000;

      const children = nodesEl.children;
      for (let i = 0; i < RINGS.length; i++) {
        const ring = RINGS[i];
        const radius = baseRadius * ring.radiusFraction;
        const angle = ring.startAngle + elapsed * ring.speed;
        const tiltRad = ring.tiltDeg * DEG;
        const rotateRad = ring.rotateDeg * DEG;

        const node = computeNode(angle, radius, tiltRad, rotateRad);
        const el = children[i] as HTMLElement | undefined;
        if (el) {
          el.style.transform = `translate(-50%, -50%) translate(${node.x}px, ${node.y}px) scale(${node.scale})`;
          el.style.opacity = String(node.opacity);
          el.style.zIndex = String(node.zIndex);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Compute SVG ring data ──
  const svgW = 900;
  const svgH = 400;
  const svgBase = svgW * 0.48;

  return (
    <section
      ref={scope}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
      style={{ background: "#000000" }}
    >
      {/* Timer element for Framer Motion delays */}
      <div className="phase-timer pointer-events-none absolute" style={{ opacity: 1, width: 0, height: 0 }} aria-hidden="true" />

      {/* ── Phase 1-2: Celestial Sphere ── */}
      <div
        className="celestial-sphere absolute text-white/40"
        style={{ opacity: 0, scale: 0.5, width: "min(450px, 80vw)", height: "min(450px, 80vw)" }}
      >
        <CelestialSphere className="h-full w-full" />
      </div>

      {/* ── Phase 3-4: ORBIT Logo System ── */}
      <div
        ref={systemRef}
        className="relative flex items-center justify-center"
        style={{ width: "clamp(320px, 80vw, 960px)", height: "clamp(140px, 35vw, 400px)" }}
      >
        {/* SVG ring paths — ultra-thin energy paths */}
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ overflow: "visible" }}
          fill="none"
        >
          {RINGS.map((ring, i) => {
            const e = projectedEllipse(ring, svgBase);
            return (
              <ellipse
                key={i}
                cx={svgW / 2}
                cy={svgH / 2}
                rx={e.rx}
                ry={e.ry}
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="1"
                className="orbital-ring-path"
                style={{ opacity: 0 }}
                transform={`rotate(${e.rotate} ${svgW / 2} ${svgH / 2})`}
              />
            );
          })}
        </svg>

        {/* ORBIT text — z-index 10 to sit between back/front nodes */}
        <div className="relative flex items-center select-none" style={{ zIndex: 10 }}>
          <span
            className="orbit-letter-O"
            style={{
              opacity: 0,
              fontFamily: "var(--font-inter-tight), sans-serif",
              fontWeight: 800,
              fontSize: "clamp(64px, 16vw, 260px)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: "white",
            }}
          >
            O
          </span>
          {["R", "B", "I", "T"].map((ch) => (
            <span
              key={ch}
              className="orbit-letter"
              style={{
                opacity: 0,
                transform: "translateX(40px)",
                filter: "blur(10px)",
                fontFamily: "var(--font-inter-tight), sans-serif",
                fontWeight: 800,
                fontSize: "clamp(64px, 16vw, 260px)",
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: "white",
              }}
            >
              {ch}
            </span>
          ))}
        </div>

        {/* Orbital nodes — positioned via requestAnimationFrame */}
        <div
          ref={nodesRef}
          className="pointer-events-none absolute inset-0"
        >
          {RINGS.map((_, i) => (
            <div
              key={i}
              className="orbital-node absolute left-1/2 top-1/2"
              style={{
                opacity: 0,
                willChange: "transform, opacity",
              }}
            >
              {assets[i] ? (
                <div
                  className="flex items-center justify-center overflow-hidden bg-white/10"
                  style={{
                    width: "clamp(24px, 3vw, 40px)",
                    height: "clamp(24px, 3vw, 40px)",
                    borderRadius: "50%",
                  }}
                >
                  <Image
                    src={assets[i]}
                    alt=""
                    width={40}
                    height={40}
                    className="h-3/4 w-3/4 object-contain"
                    style={{ filter: "brightness(0.9)" }}
                  />
                </div>
              ) : (
                <div
                  className="bg-white/60"
                  style={{
                    width: "clamp(10px, 1.2vw, 16px)",
                    height: "clamp(10px, 1.2vw, 16px)",
                    borderRadius: "50%",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Join CTA — centered below logo via flex column ── */}
      <a
        href="/login"
        className="orbit-join-cta mt-10 border border-white/30 bg-transparent px-10 py-4 font-mono text-xs uppercase tracking-[0.3em] text-white transition-all hover:border-white hover:bg-white/5"
        style={{ opacity: 0, transform: "translateY(20px)" }}
      >
        JOIN
      </a>

      {/* ── Tagline ── */}
      <div
        className="orbit-tagline mt-8 max-w-xl px-6 text-center font-mono text-[10px] uppercase leading-relaxed tracking-[0.3em] text-white md:text-xs"
        style={{ opacity: 0 }}
      >
        Where builders converge to ship code, spark ideas, and push the boundaries of what a university dev collective can become.
      </div>
    </section>
  );
}
