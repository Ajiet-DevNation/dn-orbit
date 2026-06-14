"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Progress } from "@/components/ui/8bit-progress";
import { cn } from "@/lib/utils";

// ─── Configuration ───────────────────────────────────────────────────────────

const BLOCK_SIZE = 18;
const BLOCKS_PER_FRAME = 20;
const CANVAS_SIZE = 900;
const POP_DURATION_MS = 600;
const POST_POP_DELAY_MS = 200;
const ORBIT_FADE_IN_MS = 800;

// Slower base speed for a more relaxed, stable feel
const ORBIT_PERIODS = {
  github: 12000,
  leetcode: 12000,
  linkedin: 12000,
} as const;

const ORBIT_RX = 410;
const ORBIT_RY = 135;
const PLANET_ICON_SIZE = 55;
const ORBIT_TILT = -Math.PI / 6;

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

type AnimationPhase = "drawing" | "popping" | "orbiting";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    }
  });

  const [shattered, setShattered] = useState(false);
  const [flashActive, setFlashActive] = useState(false);

  // ── Synthetic Audio Generator (Web Audio API) ─────────────────────────────
  
  const playFlashSound = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const AudioContext = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
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
        CANVAS_SIZE / img.naturalHeight
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
        const ctx = canvasRef.current?.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            ctx.fillStyle = `rgba(${block.r}, ${block.g}, ${block.b}, ${block.a / 255})`;
            ctx.fillRect(block.x, block.y, BLOCK_SIZE, BLOCK_SIZE);
          }
        }
        setDrawProgress(100);
        setTimeout(() => {
          if (!isMountedRef.current) return;
          setPhase("popping");
          setPopActive(true);
        }, 100);
        return;
      }

      let currentBlock = 0;

      const animate = () => {
        if (!isMountedRef.current) return;

        if (currentBlock >= blocks.length) {
          setDrawProgress(100);
          setTimeout(() => {
            if (!isMountedRef.current) return;
            setPhase("popping");
            setPopActive(true);
          }, 100);
          return;
        }

        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.imageSmoothingEnabled = false;
            const end = Math.min(currentBlock + BLOCKS_PER_FRAME, blocks.length);
            for (let i = currentBlock; i < end; i++) {
              const block = blocks[i];
              ctx.fillStyle = `rgba(${block.r}, ${block.g}, ${block.b}, ${block.a / 255})`;
              ctx.fillRect(block.x, block.y, BLOCK_SIZE, BLOCK_SIZE);
            }
            currentBlock = end;
          }
        }

        const raw = Math.floor((currentBlock / Math.max(blocks.length, 1)) * 100);
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
  }, [mode]);

  useEffect(() => {
    drawLogo();
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [drawLogo]);

  // ── Phase 2→3: Pop → Orbit ───────────────────────────────────────────────
  
  useEffect(() => {
    if (phase !== "popping") return;

    const orbitTimer = setTimeout(() => {
      setPhase("orbiting");
    }, POP_DURATION_MS + POST_POP_DELAY_MS);

    return () => clearTimeout(orbitTimer);
  }, [phase]);

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
      const phys = physics.current;
      const now = performance.now();

      let ringOpacity = 1;
      let ringScale = 1;

      if (phys.isShattered) {
        const timeSinceShatter = now - phys.shatterStartTime;
        if (timeSinceShatter < 6000) {
          ringOpacity = 0; 
        } else {
          const progress = Math.min((timeSinceShatter - 6000) / 11000, 1);
          const easeOut = 1 - Math.pow(1 - progress, 3);
          ringOpacity = progress; 
          ringScale = 0.8 + 0.2 * easeOut; 
        }
      }

      const bctx = backCanvas.getContext("2d");
      const fctx = frontCanvas.getContext("2d");

      if (ringOpacity <= 0) {
        if (bctx) bctx.clearRect(0, 0, w, h);
        if (fctx) fctx.clearRect(0, 0, w, h);
        frame = requestAnimationFrame(drawOrbitRing);
        return;
      }

      const drawSaturnRing = (ctx: CanvasRenderingContext2D, isBack: boolean) => {
        const startAngle = isBack ? Math.PI : 0;
        const endAngle = isBack ? 2 * Math.PI : Math.PI;
        
        ctx.save();
        
        ctx.translate(cx, cy);
        ctx.scale(ringScale, ringScale);
        ctx.translate(-cx, -cy);

        ctx.shadowColor = `rgba(34, 197, 94, ${0.8 * ringOpacity})`;
        ctx.shadowBlur = 15;

        ctx.beginPath();
        ctx.ellipse(cx, cy, ORBIT_RX, ORBIT_RY, ORBIT_TILT, startAngle, endAngle);
        ctx.strokeStyle = `rgba(34, 197, 94, ${(isBack ? 0.2 : 0.4) * ringOpacity})`;
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(cx, cy, ORBIT_RX, ORBIT_RY, ORBIT_TILT, startAngle, endAngle);
        ctx.strokeStyle = `rgba(255, 255, 255, ${(isBack ? 0.1 : 0.3) * ringOpacity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
      };

      if (bctx) {
        bctx.clearRect(0, 0, w, h);
        drawSaturnRing(bctx, true);
      }

      if (fctx) {
        fctx.clearRect(0, 0, w, h);
        drawSaturnRing(fctx, false);
      }

      frame = requestAnimationFrame(drawOrbitRing);
    };

    frame = requestAnimationFrame(drawOrbitRing);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  // ── Physics Position Calculator ────────────────────────────────────────────

  const [planetPositions, setPlanetPositions] = useState({
    github: { x: 0, y: 0, scale: 1, z: 0 },
    leetcode: { x: 0, y: 0, scale: 1, z: 0 },
    linkedin: { x: 0, y: 0, scale: 1, z: 0 },
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
        phys.spinVelocity += (1 - phys.spinVelocity) * 0.05;
        
        let currentSpin = phys.spinVelocity;

        if (phys.isShattered) {
          const timeSinceShatter = now - phys.shatterStartTime;
          if (timeSinceShatter > 6000 && timeSinceShatter < 17000) {
            const reformProgress = (timeSinceShatter - 6000) / 11000;
            const extraSpin = Math.pow(1 - reformProgress, 2) * 12; 
            currentSpin += extraSpin;
          }
        }

        phys.accumulatedTime += delta * currentSpin;
      }

      const calcPos = (period: number, offset: number) => {
        const angle = ((phys.accumulatedTime / period) * Math.PI * 2 + offset) % (Math.PI * 2);
        const unX = ORBIT_RX * Math.cos(angle);
        const unY = ORBIT_RY * Math.sin(angle);
        const x = unX * Math.cos(ORBIT_TILT) - unY * Math.sin(ORBIT_TILT);
        const y = unX * Math.sin(ORBIT_TILT) + unY * Math.cos(ORBIT_TILT);
        const z = Math.sin(angle);
        const scale = 0.7 + 0.3 * ((z + 1) / 2);
        return { x, y, scale, z };
      };

      const targetPositions = {
        github: calcPos(ORBIT_PERIODS.github, 0),
        leetcode: calcPos(ORBIT_PERIODS.leetcode, (Math.PI * 2) / 3),
        linkedin: calcPos(ORBIT_PERIODS.linkedin, (Math.PI * 4) / 3),
      };

      if (phys.isShattered) {
        const timeSinceShatter = now - phys.shatterStartTime;

        if (timeSinceShatter >= 17000) {
          phys.isShattered = false;
          setShattered(false);
          setPlanetPositions(targetPositions);
          
          setFlashActive(true);
          playFlashSound(); 
          setTimeout(() => setFlashActive(false), 50);

        } else {
          const isReforming = timeSinceShatter > 6000;
          const reformProgress = isReforming ? (timeSinceShatter - 6000) / 11000 : 0;

          Object.keys(phys.particles).forEach((key, index) => {
            const k = key as keyof typeof phys.particles;
            const p = phys.particles[k];
            const t = targetPositions[k];

            if (!isReforming) {
              p.x += p.vx;
              p.y += p.vy;

              const dist = Math.sqrt(p.x * p.x + p.y * p.y) || 1;

              const pushStrength = 0.04 * (1 - timeSinceShatter / 6000); 
              p.vx += (p.x / dist) * pushStrength;
              p.vy += (p.y / dist) * pushStrength;

              p.x += Math.sin(now / 500 + index) * 0.8;
              p.y += Math.cos(now / 400 + index) * 0.8;

              const LOGO_HALF_W = 330;
              const LOGO_HALF_H = 150;

              if (Math.abs(p.x) < LOGO_HALF_W && Math.abs(p.y) < LOGO_HALF_H) {
                const distToXEdge = LOGO_HALF_W - Math.abs(p.x);
                const distToYEdge = LOGO_HALF_H - Math.abs(p.y);

                if (distToXEdge < distToYEdge) {
                  p.x = Math.sign(p.x) * LOGO_HALF_W;
                  p.vx *= -0.9;
                } else {
                  p.y = Math.sign(p.y) * LOGO_HALF_H;
                  p.vy *= -0.9;
                }
              }

              const OUTER_BOUNDS = 400;
              if (dist > OUTER_BOUNDS) {
                p.vx -= (p.x / dist) * 0.3;
                p.vy -= (p.y / dist) * 0.3;
              }

              p.vx *= 0.98;
              p.vy *= 0.98;

              p.scale += (1 - p.scale) * 0.02;
              p.z += (0 - p.z) * 0.02;

            } else {
              p.vx *= 0.85;
              p.vy *= 0.85;
              p.x += p.vx;
              p.y += p.vy;

              const pullStrength = 0.005 + Math.pow(reformProgress, 2) * 0.20; 
              p.x += (t.x - p.x) * pullStrength;
              p.y += (t.y - p.y) * pullStrength;
              p.z += (t.z - p.z) * pullStrength;
              p.scale += (t.scale - p.scale) * pullStrength;
            }
          });

          setPlanetPositions({ ...phys.particles });
        }
      } else {
        setPlanetPositions(targetPositions);
      }

      frame = requestAnimationFrame(updatePositions);
    };

    frame = requestAnimationFrame(updatePositions);
    return () => cancelAnimationFrame(frame);
  }, [phase, playFlashSound]);

  // ── Drag & Shatter Interaction Handlers ─────────────────────────────────────

  const triggerShatter = useCallback(() => {
    const phys = physics.current;
    phys.isShattered = true;
    phys.shatterStartTime = performance.now();
    hasShatteredRef.current = true; 
    setShattered(true);

    const speed = Math.min(Math.abs(phys.spinVelocity), 40); 
    const dir = Math.sign(phys.spinVelocity) || 1;

    setPlanetPositions((prev) => {
      const keys: (keyof typeof prev)[] = ["github", "leetcode", "linkedin"];
      keys.forEach((k) => {
        const pos = prev[k];
        const angle = Math.atan2(pos.y, pos.x);
        
        const tangent = angle + (dir * Math.PI / 2);
        
        phys.particles[k] = {
          x: pos.x,
          y: pos.y,
          vx: (Math.cos(tangent) * 0.5 + Math.cos(angle) * 1.5) * speed * 0.4,
          vy: (Math.sin(tangent) * 0.5 + Math.sin(angle) * 1.5) * speed * 0.4, 
          scale: pos.scale,
          z: pos.z
        };
      });
      return { ...phys.particles }; 
    });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (physics.current.isShattered || phase !== "orbiting") return;
    physics.current.isDragging = true;
    physics.current.lastMouseY = e.clientY;
    physics.current.spinVelocity = 0; 
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!physics.current.isDragging || physics.current.isShattered || phase !== "orbiting") return;
    
    const deltaY = e.clientY - physics.current.lastMouseY;
    physics.current.lastMouseY = e.clientY;
    
    physics.current.accumulatedTime -= deltaY * 30; 
    physics.current.spinVelocity = -deltaY; 
  };

  const handleMouseUp = () => {
    if (!physics.current.isDragging || physics.current.isShattered) return;
    physics.current.isDragging = false;
    
    if (Math.abs(physics.current.spinVelocity) > 20) {
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
  const showProgress = phase === "drawing";

  const logoScale =
    phase === "drawing"
      ? 1
      : popActive
        ? 1.08
        : 1;

  const wrapperClass =
    mode === "loading"
      ? "fixed inset-0 z-[100] flex items-center justify-center bg-bg/95 backdrop-blur-sm pt-[100px]"
      : "relative flex min-h-[100vh] w-full items-center justify-center overflow-hidden";

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
          background: "radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 60%)",
        }}
      />

      {/* ── Reforming Flash Effect ── */}
      <div
        className="pointer-events-none absolute inset-0 z-[80] flex items-center justify-center -translate-y-20"
        style={{
          opacity: flashActive ? 1 : 0,
          transition: flashActive ? "none" : "opacity 1.5s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div
          className="w-[800px] h-[300px] rounded-[100%]"
          style={{
            background: "radial-gradient(ellipse at center, rgba(255,255,255,1) 0%, rgba(34,197,94,0.6) 30%, transparent 70%)",
            transform: `rotate(${ORBIT_TILT}rad) scale(${flashActive ? 0.5 : 1.2})`,
            transition: flashActive ? "none" : "transform 1.5s cubic-bezier(0.16, 1, 0.3, 1)",
            filter: "blur(20px)",
            mixBlendMode: "screen",
          }}
        />
      </div>

      <div className="relative z-10 flex w-full max-w-[700px] flex-col items-center -translate-y-20">
        
        <div 
          role="application"
          aria-label="Interactive Orbit Physics Canvas"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          className={cn(
            "relative w-full aspect-square flex items-center justify-center focus:outline-none",
            !shattered && phase === "orbiting" && "cursor-grab active:cursor-grabbing"
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          
          {showOrbit && (
            <canvas
              ref={orbitCanvasBackRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="absolute inset-0 z-0 w-full h-full pointer-events-none"
              style={{
                opacity: orbitVisible ? 1 : 0,
                transition: shattered ? "none" : `opacity ${ORBIT_FADE_IN_MS}ms ease-out`,
              }}
            />
          )}

          <div
            className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
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

          {showOrbit && (
            <canvas
              ref={orbitCanvasFrontRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="absolute inset-0 z-20 w-full h-full pointer-events-none"
              style={{
                opacity: orbitVisible ? 1 : 0,
                transition: shattered ? "none" : `opacity ${ORBIT_FADE_IN_MS}ms ease-out`,
              }}
            />
          )}

          {showOrbit && (
            <>
              {/* GitHub */}
              <div
                className="absolute pointer-events-auto flex items-center justify-center"
                onMouseEnter={() => (isPausedRef.current = true)}
                onMouseLeave={() => (isPausedRef.current = false)}
                style={{
                  width: PLANET_ICON_SIZE,
                  height: PLANET_ICON_SIZE,
                  left: `calc(50% + ${(planetPositions.github.x / CANVAS_SIZE) * 100}%)`,
                  top: `calc(50% + ${(planetPositions.github.y / CANVAS_SIZE) * 100}%)`,
                  transform: `translate(-50%, -50%) scale(${planetPositions.github.scale})`,
                  zIndex: planetPositions.github.z > 0 ? 30 : 5,
                  opacity: orbitVisible ? (0.6 + 0.4 * ((planetPositions.github.z + 1) / 2)) : 0,
                  transition: shattered ? "none" : `opacity ${ORBIT_FADE_IN_MS}ms ease-out`,
                }}
              >
                <a
                  href="https://github.com/Ajiet-DevNation"
                  target="_blank"
                  rel="noopener noreferrer"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  className="flex h-full w-full cursor-pointer items-center justify-center transition-transform duration-300 hover:scale-[1.7]"
                >
                  <GitHubIcon size={PLANET_ICON_SIZE * 0.85} />
                </a>
              </div>

              {/* LeetCode */}
              <div
                className="absolute pointer-events-auto flex items-center justify-center"
                onMouseEnter={() => (isPausedRef.current = true)}
                onMouseLeave={() => (isPausedRef.current = false)}
                style={{
                  width: PLANET_ICON_SIZE,
                  height: PLANET_ICON_SIZE,
                  left: `calc(50% + ${(planetPositions.leetcode.x / CANVAS_SIZE) * 100}%)`,
                  top: `calc(50% + ${(planetPositions.leetcode.y / CANVAS_SIZE) * 100}%)`,
                  transform: `translate(-50%, -50%) scale(${planetPositions.leetcode.scale})`,
                  zIndex: planetPositions.leetcode.z > 0 ? 30 : 5,
                  opacity: orbitVisible ? (0.6 + 0.4 * ((planetPositions.leetcode.z + 1) / 2)) : 0,
                  transition: shattered ? "none" : `opacity ${ORBIT_FADE_IN_MS}ms ease-out`,
                }}
              >
                <a
                  href="https://leetcode.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  className="flex h-full w-full cursor-pointer items-center justify-center transition-transform duration-300 hover:scale-[1.7]"
                >
                  <LeetCodeIcon size={PLANET_ICON_SIZE * 0.85} />
                </a>
              </div>

              {/* LinkedIn */}
              <div
                className="absolute pointer-events-auto flex items-center justify-center"
                onMouseEnter={() => (isPausedRef.current = true)}
                onMouseLeave={() => (isPausedRef.current = false)}
                style={{
                  width: PLANET_ICON_SIZE,
                  height: PLANET_ICON_SIZE,
                  left: `calc(50% + ${(planetPositions.linkedin.x / CANVAS_SIZE) * 100}%)`,
                  top: `calc(50% + ${(planetPositions.linkedin.y / CANVAS_SIZE) * 100}%)`,
                  transform: `translate(-50%, -50%) scale(${planetPositions.linkedin.scale})`,
                  zIndex: planetPositions.linkedin.z > 0 ? 30 : 5,
                  opacity: orbitVisible ? (0.6 + 0.4 * ((planetPositions.linkedin.z + 1) / 2)) : 0,
                  transition: shattered ? "none" : `opacity ${ORBIT_FADE_IN_MS}ms ease-out`,
                }}
              >
              <a
                href="https://www.linkedin.com/company/devnationajiet/"
                target="_blank"
                rel="noopener noreferrer"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                className="flex h-full w-full cursor-pointer items-center justify-center transition-transform duration-300 hover:scale-[1.7]"
              >
                <LinkedInIcon size={PLANET_ICON_SIZE * 0.85} />
                </a>
              </div>
            </>
          )}
        </div>

        <div
          className={cn(
            "mt-8 flex w-full max-w-xs flex-col items-center gap-4 retro",
            "dark"
          )}
          style={{
            opacity: isMounted && showProgress ? 1 : 0,
            transform: isMounted && showProgress ? "translateY(0) scale(1)" : "translateY(16px) scale(0.95)",
            filter: isMounted && showProgress ? "blur(0)" : "blur(4px)",
            transition: "all 600ms cubic-bezier(0.16, 1, 0.3, 1)",
            pointerEvents: showProgress ? "auto" : "none",
          }}
        >
          <p
            className="text-[10px] uppercase tracking-widest text-accent pixel-pulse-text"
          >
            LOADING...
          </p>

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

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pixel-pulse {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.3; }
        }
        .pixel-pulse-text {
          animation: pixel-pulse 1.5s step-end infinite;
          text-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
        }
      ` }} />
    </div>
  );
}
