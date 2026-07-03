"use client";

import { useEffect, useRef } from "react";

const CHARS = "⣧⣩⣪⣫⣬⣭⣮⣯⣱⣲⣳⣴⣵⣶⣷⣹⣺⣻⣼⣽⣾⣿⠁⠂⠄⠈⠐⠠⡀⢀⠃⠅⠘⠊⠋⠌⠍⠎⠏⠑⠒⠓⠔⠕⠖⠗⠙⠚⠛";

// Smaller grid = far fewer cells to draw each frame (32×32 = 1024 vs 55×55 = 3025).
const GRID_SIZE = 32;
// Cap the redraw rate. RAF would otherwise run at the monitor's full refresh
// (60/120/144Hz), redrawing thousands of canvas glyphs each time — the main
// source of CPU/GPU heat. 24fps is plenty for a subtle background wave.
const TARGET_FPS = 5;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
// Advance the wave clock per drawn frame so animation speed stays the same
// regardless of the (now lower) frame rate. 24fps × 0.025 ≈ 0.6/sec.
const TIME_STEP = 0.025;

interface Wave {
  x: number;
  y: number;
  frequency: number;
  amplitude: number;
  phase: number;
  speed: number;
}

export function AsciiBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Grab the context ONCE — not every frame.
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const waves: Wave[] = Array.from({ length: 4 }, () => ({
      x: GRID_SIZE * (0.2 + Math.random() * 0.6),
      y: GRID_SIZE * (0.2 + Math.random() * 0.6),
      frequency: 0.18 + Math.random() * 0.25,
      amplitude: 0.4 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      speed: 0.25 + Math.random() * 0.3,
    }));

    let rafId = 0;
    let time = 0;
    let lastDraw = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      // setTransform (not scale) so repeated resizes don't compound the scale.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (width === 0 || height === 0) return;

      time += TIME_STEP;

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, width, height);

      const cellWidth = width / GRID_SIZE;
      const cellHeight = height / GRID_SIZE;
      const fontSize = Math.min(cellWidth, cellHeight) * 0.8;
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          let totalWave = 0;
          for (const wave of waves) {
            const dx = x - wave.x;
            const dy = y - wave.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const falloff = 1 / (1 + dist * 0.12);
            totalWave +=
              Math.sin(dist * wave.frequency - time * wave.speed + wave.phase) *
              wave.amplitude *
              falloff;
          }

          if (Math.abs(totalWave) > 0.2) {
            const normalizedWave = (totalWave + 2) / 4;
            const charIndex = Math.min(
              CHARS.length - 1,
              Math.max(0, Math.floor(normalizedWave * (CHARS.length - 1))),
            );
            const opacity = Math.min(
              0.25,
              Math.max(0.05, normalizedWave * 0.25),
            );
            ctx.fillStyle = `rgba(160, 160, 160, ${opacity})`;
            ctx.fillText(
              CHARS[charIndex] ?? CHARS[0],
              x * cellWidth + cellWidth / 2,
              y * cellHeight + cellHeight / 2,
            );
          }
        }
      }
    };

    // Throttled RAF loop: schedules every frame but only repaints at TARGET_FPS.
    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop);
      if (now - lastDraw < FRAME_INTERVAL) return;
      lastDraw = now;
      draw();
    };

    const start = () => {
      if (rafId) return;
      lastDraw = 0;
      rafId = requestAnimationFrame(loop);
    };

    const stop = () => {
      if (!rafId) return;
      cancelAnimationFrame(rafId);
      rafId = 0;
    };

    // Pause whenever the canvas is scrolled out of view OR the tab is hidden,
    // so it isn't burning cycles when nobody can see it.
    let onScreen = true;
    const syncRunning = () => {
      if (onScreen && !document.hidden) start();
      else stop();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        syncRunning();
      },
      { threshold: 0 },
    );
    observer.observe(canvas);

    const onVisibility = () => syncRunning();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", resize);

    resize();
    syncRunning();

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}
