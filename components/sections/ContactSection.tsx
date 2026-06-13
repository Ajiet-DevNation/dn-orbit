"use client";

import { useRef, useEffect, useCallback } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
} from "framer-motion";

import type { MotionValue } from "framer-motion";

/* ══════════════════════════════════════════════════════════════
   CONTACT SECTION — Solar-System Orbital Network

   DEVNATION is the central celestial body. Contact nodes are
   satellites orbiting on elliptical paths at different speeds.

   Architecture:
     • SVG holds all orbital elements (rings + node markers)
     • requestAnimationFrame drives continuous orbital rotation
     • Mouse parallax shifts the entire orbital system
     • Scroll-triggered ratcheted reveal for entrance animation

   Orbit speeds (inner → outer):
     Inner  — 80s per revolution  (fastest)
     Middle — 120s per revolution
     Outer  — 160s per revolution (slowest)
   ══════════════════════════════════════════════════════════════ */

/* ── Ratchet Hook ── */

function useRatchet(source: MotionValue<number>): MotionValue<number> {
  const ratcheted = useMotionValue(0);
  const maxRef = useRef(0);

  useEffect(() => {
    const initial = source.get();
    if (initial > maxRef.current) {
      maxRef.current = initial;
      ratcheted.set(initial);
    }
    const unsubscribe = source.on("change", (v) => {
      if (v > maxRef.current) {
        maxRef.current = v;
        ratcheted.set(v);
      }
    });
    return unsubscribe;
  }, [source, ratcheted]);

  return ratcheted;
}

/* ── Node Data ── */

interface ContactNode {
  label: string;
  value: string;
  href?: string;
}

const NODES: ContactNode[] = [
  {
    label: "GITHUB",
    value: "github.com/devnation",
    href: "https://github.com/devnation",
  },
  {
    label: "EMAIL",
    value: "hello@devnation.dev",
    href: "mailto:hello@devnation.dev",
  },
  {
    label: "LINKEDIN",
    value: "linkedin.com/company/devnation",
    href: "https://linkedin.com/company/devnation",
  },
  {
    label: "LOCATION",
    value: "Global Community",
  },
];

/* ── Orbit configuration for each node ── */

interface OrbitConfig {
  /** Semi-major axis (horizontal radius) */
  rx: number;
  /** Semi-minor axis (vertical radius) */
  ry: number;
  /** Ellipse tilt in degrees */
  rotation: number;
  /** Starting angle in radians */
  startAngle: number;
  /** Seconds for one full revolution */
  period: number;
}

const NODE_ORBITS: OrbitConfig[] = [
  // GitHub — inner orbit, upper-right quadrant
  { rx: 220, ry: 145, rotation: -12, startAngle: (5.5 * Math.PI) / 4, period: 80 },
  // Email — middle orbit, upper-left quadrant
  { rx: 400, ry: 240, rotation: -8, startAngle: (2.8 * Math.PI) / 4, period: 120 },
  // LinkedIn — outer orbit, lower-left quadrant
  { rx: 580, ry: 320, rotation: -5, startAngle: (5.0 * Math.PI) / 4, period: 160 },
  // Location — middle orbit, lower-right quadrant
  { rx: 400, ry: 240, rotation: -8, startAngle: (7.2 * Math.PI) / 4, period: 120 },
];

/* ── Geometry helpers ── */

const W = 1400;
const H = 900;
const CX = W / 2;
const CY = H / 2;

/** Compute a point on a rotated ellipse at a given angle */
function ellipsePoint(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotationDeg: number,
  angle: number,
): { x: number; y: number } {
  const cosR = Math.cos((rotationDeg * Math.PI) / 180);
  const sinR = Math.sin((rotationDeg * Math.PI) / 180);
  const ex = rx * Math.cos(angle);
  const ey = ry * Math.sin(angle);
  return {
    x: cx + ex * cosR - ey * sinR,
    y: cy + ex * sinR + ey * cosR,
  };
}

/** Generate SVG path string for a rotated ellipse */
function ellipsePath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotationDeg: number,
): string {
  const cosR = Math.cos((rotationDeg * Math.PI) / 180);
  const sinR = Math.sin((rotationDeg * Math.PI) / 180);
  const pts: string[] = [];
  const n = 120;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * 2 * Math.PI;
    const ex = rx * Math.cos(a);
    const ey = ry * Math.sin(a);
    const x = cx + ex * cosR - ey * sinR;
    const y = cy + ex * sinR + ey * cosR;
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(" ") + " Z";
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */

export function ContactSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  /* Node group refs — for direct DOM manipulation (no re-renders) */
  const nodeRef0 = useRef<SVGGElement>(null);
  const nodeRef1 = useRef<SVGGElement>(null);
  const nodeRef2 = useRef<SVGGElement>(null);
  const nodeRef3 = useRef<SVGGElement>(null);
  const nodeRefs = [nodeRef0, nodeRef1, nodeRef2, nodeRef3];

  /* Mouse parallax values */
  const parallaxX = useMotionValue(0);
  const parallaxY = useMotionValue(0);

  /* ── Scroll progress ── */
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });
  const p = useRatchet(scrollYProgress);

  /* ── Hub reveal ── */
  const hubOpacity = useTransform(p, [0, 0.08], [0, 1]);

  /* ── Ring drawing ── */
  const r1Draw = useTransform(p, [0.08, 0.2], [1, 0]);
  const r1Op = useTransform(p, [0.08, 0.14], [0, 1]);
  const r2Draw = useTransform(p, [0.18, 0.3], [1, 0]);
  const r2Op = useTransform(p, [0.18, 0.24], [0, 1]);
  const r3Draw = useTransform(p, [0.28, 0.38], [1, 0]);
  const r3Op = useTransform(p, [0.28, 0.34], [0, 1]);

  /* ── Node reveal ── */
  const n0Op = useTransform(p, [0.35, 0.48], [0, 1]);
  const n1Op = useTransform(p, [0.44, 0.57], [0, 1]);
  const n2Op = useTransform(p, [0.53, 0.66], [0, 1]);
  const n3Op = useTransform(p, [0.62, 0.75], [0, 1]);
  const nodeOpacities = [n0Op, n1Op, n2Op, n3Op];

  /* ── Footer ── */
  const footerOp = useTransform(p, [0.7, 0.8], [0, 1]);

  /* ── Ring geometry ── */
  const ring1 = ellipsePath(CX, CY, 220, 145, -12);
  const ring2 = ellipsePath(CX, CY, 400, 240, -8);
  const ring3 = ellipsePath(CX, CY, 580, 320, -5);
  const peri1 = 1180;
  const peri2 = 2040;
  const peri3 = 2880;

  const r1Offset = useTransform(r1Draw, (v) => v * peri1);
  const r2Offset = useTransform(r2Draw, (v) => v * peri2);
  const r3Offset = useTransform(r3Draw, (v) => v * peri3);

  /* ── Mouse parallax handler ── */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      parallaxX.set((e.clientX - cx) * 0.04);
      parallaxY.set((e.clientY - cy) * 0.04);
    },
    [parallaxX, parallaxY],
  );

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  /* ── Orbital animation loop ── */
  useEffect(() => {
    let raf: number;
    const start = performance.now();

    function tick() {
      const elapsed = (performance.now() - start) / 1000;

      NODE_ORBITS.forEach((orbit, i) => {
        const ref = nodeRefs[i];
        if (!ref.current) return;

        const angle =
          orbit.startAngle + (elapsed / orbit.period) * 2 * Math.PI;
        const pos = ellipsePoint(
          CX,
          CY,
          orbit.rx,
          orbit.ry,
          orbit.rotation,
          angle,
        );

        ref.current.setAttribute(
          "transform",
          `translate(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`,
        );
      });

      raf = requestAnimationFrame(tick);
    }

    tick();
    return () => cancelAnimationFrame(raf);
    // nodeRefs are stable refs — no dependency needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative"
      style={{ height: "280vh", background: "#000000" }}
    >
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden">
        {/* Parallax-shifted orbital system */}
        <motion.div
          className="relative flex h-full w-full items-center justify-center"
          style={{ x: parallaxX, y: parallaxY }}
        >
          {/* ═══ SVG ORBITAL FIELD ═══ */}
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="absolute h-full w-full"
            fill="none"
            preserveAspectRatio="xMidYMid meet"
            style={{ overflow: "visible" }}
          >
            {/* ── Ring paths ── */}
            <motion.path
              d={ring1}
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="0.8"
              strokeDasharray={peri1}
              style={{ strokeDashoffset: r1Offset, opacity: r1Op }}
            />
            <motion.path
              d={ring2}
              stroke="rgba(255,255,255,0.14)"
              strokeWidth="0.7"
              strokeDasharray={peri2}
              style={{ strokeDashoffset: r2Offset, opacity: r2Op }}
            />
            <motion.path
              d={ring3}
              stroke="rgba(255,255,255,0.09)"
              strokeWidth="0.6"
              strokeDasharray={peri3}
              style={{ strokeDashoffset: r3Offset, opacity: r3Op }}
            />

            {/* ── Ambient orbit dust ── */}
            <motion.circle cx={CX + 185} cy={CY - 110} r="2" fill="rgba(255,255,255,0.2)" style={{ opacity: r1Op }} />
            <motion.circle cx={CX - 195} cy={CY + 120} r="1.5" fill="rgba(255,255,255,0.15)" style={{ opacity: r1Op }} />
            <motion.circle cx={CX + 360} cy={CY + 80} r="1.5" fill="rgba(255,255,255,0.12)" style={{ opacity: r2Op }} />
            <motion.circle cx={CX - 370} cy={CY - 65} r="1.5" fill="rgba(255,255,255,0.1)" style={{ opacity: r2Op }} />
            <motion.circle cx={CX + 520} cy={CY - 50} r="1" fill="rgba(255,255,255,0.08)" style={{ opacity: r3Op }} />
            <motion.circle cx={CX - 540} cy={CY + 100} r="1" fill="rgba(255,255,255,0.08)" style={{ opacity: r3Op }} />

            {/* ── Central celestial body ── */}
            <defs>
              <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.07)" />
                <stop offset="60%" stopColor="rgba(255,255,255,0.02)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
            </defs>

            {/* Ambient glow */}
            <motion.circle
              cx={CX}
              cy={CY}
              r="90"
              fill="url(#hubGlow)"
              style={{ opacity: hubOpacity }}
            />

            {/* Outer ring */}
            <motion.circle
              cx={CX}
              cy={CY}
              r="72"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="0.7"
              fill="none"
              style={{ opacity: hubOpacity }}
            />
            {/* Pulsing aura ring */}
            <motion.circle
              cx={CX}
              cy={CY}
              r="72"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="0.5"
              fill="none"
              className="celestial-pulse-ring"
              style={{ opacity: hubOpacity }}
            />
            {/* Inner dashed ring */}
            <motion.circle
              cx={CX}
              cy={CY}
              r="56"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="0.5"
              strokeDasharray="3 5"
              fill="none"
              style={{ opacity: hubOpacity }}
            />
            {/* Core dot */}
            <motion.circle
              cx={CX}
              cy={CY}
              r="3"
              fill="rgba(255,255,255,0.3)"
              style={{ opacity: hubOpacity }}
            />

            {/* Hub text — pure SVG, no foreignObject */}
            <motion.g style={{ opacity: hubOpacity }}>
              <text
                x={CX}
                y={CY - 14}
                fill="rgba(255,255,255,0.35)"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                ✦
              </text>
              <text
                x={CX}
                y={CY + 4}
                fill="white"
                fontSize="18"
                fontWeight="700"
                fontFamily="var(--font-inter-tight), sans-serif"
                textAnchor="middle"
                dominantBaseline="middle"
                letterSpacing="0.14em"
              >
                DEVNATION
              </text>
              <text
                x={CX}
                y={CY + 22}
                fill="rgba(255,255,255,0.3)"
                fontSize="7"
                fontFamily="monospace"
                textAnchor="middle"
                dominantBaseline="middle"
                letterSpacing="0.2em"
              >
                COMMUNICATION HUB
              </text>
            </motion.g>

            {/* ── Satellite nodes ── */}
            {NODES.map((node, i) => (
              <g key={node.label} ref={nodeRefs[i]}>
                <motion.g style={{ opacity: nodeOpacities[i] }}>
                  {/* Anchor pulse — faint ring */}
                  <circle
                    r="22"
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="0.6"
                    className="orbital-pulse"
                  />
                  {/* Satellite body */}
                  <circle
                    r="16"
                    fill="rgba(255,255,255,0.04)"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="0.8"
                    className="orbital-satellite"
                  />
                  {/* Core dot */}
                  <circle r="3" fill="rgba(255,255,255,0.5)" />

                  {/* Icon — pure SVG paths, no foreignObject */}
                  <g
                    transform="translate(-6, -6) scale(0.5)"
                    fill="none"
                    stroke="rgba(255,255,255,0.55)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {node.label === "GITHUB" && (
                      /* Code brackets icon */
                      <>
                        <polyline points="8,4 2,12 8,20" />
                        <polyline points="16,4 22,12 16,20" />
                      </>
                    )}
                    {node.label === "EMAIL" && (
                      /* Mail icon */
                      <>
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <polyline points="2,4 12,13 22,4" />
                      </>
                    )}
                    {node.label === "LINKEDIN" && (
                      /* Globe icon */
                      <>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12,2 C14.5,4 16,8 16,12 C16,16 14.5,20 12,22" />
                        <path d="M12,2 C9.5,4 8,8 8,12 C8,16 9.5,20 12,22" />
                      </>
                    )}
                    {node.label === "LOCATION" && (
                      /* Map pin icon */
                      <>
                        <path d="M12,2 C8.13,2 5,5.13 5,9 C5,14.25 12,22 12,22 C12,22 19,14.25 19,9 C19,5.13 15.87,2 12,2 Z" />
                        <circle cx="12" cy="9" r="3" />
                      </>
                    )}
                  </g>

                  {/* Label — always visible, offset to the right */}
                  <g className="orbital-label">
                    {/* Connector line from node to label */}
                    <line
                      x1="18"
                      y1="0"
                      x2="32"
                      y2="0"
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="0.5"
                    />
                    <text
                      x="36"
                      y="-4"
                      fill="rgba(255,255,255,0.65)"
                      fontSize="10"
                      fontFamily="monospace"
                      letterSpacing="0.15em"
                    >
                      {node.label}
                    </text>
                    <text
                      x="36"
                      y="10"
                      fill="rgba(255,255,255,0.25)"
                      fontSize="7.5"
                      fontFamily="monospace"
                    >
                      {node.value}
                    </text>
                  </g>

                  {/* Clickable overlay */}
                  {node.href && (
                    <a
                      href={node.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <circle
                        r="22"
                        fill="transparent"
                        style={{ cursor: "pointer", pointerEvents: "auto" }}
                      />
                    </a>
                  )}
                </motion.g>
              </g>
            ))}
          </svg>

          {/* Hub is now fully rendered in SVG above — no HTML overlay needed */}
        </motion.div>

        {/* ═══ FOOTER BAR ═══ */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 border-t border-white/8 px-6 py-3 md:px-12"
          style={{ opacity: footerOp }}
        >
          <div className="mx-auto flex max-w-[1400px] items-center justify-between">
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/20 md:text-[10px]">
              © {new Date().getFullYear()} DEVNATION. All rights reserved.
            </p>
            <p className="hidden font-mono text-[9px] tracking-wider text-white/15 sm:block md:text-[10px]">
              Let&apos;s build something great together. ✦
            </p>
          </div>
        </motion.div>
      </div>

      {/* ═══ Orbital animation styles ═══ */}
      <style jsx global>{`
        @keyframes celestialPulseRing {
          0%, 100% {
            r: 72;
            stroke-opacity: 0.1;
          }
          50% {
            r: 82;
            stroke-opacity: 0.03;
          }
        }

        .celestial-pulse-ring {
          animation: celestialPulseRing 4s ease-in-out infinite;
        }

        @keyframes orbitalPulse {
          0%, 100% {
            r: 22;
            stroke-opacity: 0.15;
          }
          50% {
            r: 27;
            stroke-opacity: 0.05;
          }
        }

        .orbital-pulse {
          animation: orbitalPulse 3s ease-in-out infinite;
        }

        .orbital-satellite {
          transition: stroke 0.3s ease, fill 0.3s ease;
        }

        .orbital-satellite:hover {
          stroke: rgba(255, 255, 255, 0.6);
          fill: rgba(255, 255, 255, 0.08);
        }
      `}</style>
    </section>
  );
}
