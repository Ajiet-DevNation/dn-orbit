"use client";

import { useEffect, useRef } from "react";

export function PixelStarsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Calculate "just the right amount" based on screen size
    const starCount = Math.floor((width * height) / 15000); // 1 star per 15,000 pixels
    
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random(),
      y: Math.random(),
      // 8-bit style sizes: mostly 2px, some 3px, rare 4px
      size: Math.random() > 0.95 ? 4 : Math.random() > 0.8 ? 3 : 2, 
      opacity: Math.random(),
      speed: Math.random() * 0.02 + 0.005,
    }));

    // Draw every star once at its current opacity (no state advance). Used for
    // both the animated frames and the static reduced-motion render.
    const paint = () => {
      ctx.clearRect(0, 0, width, height);
      for (const star of stars) {
        const currentOpacity = Math.max(0, Math.min(1, star.opacity)) * 0.6;
        ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
        // Floor coordinates to keep the pixels crisp/aligned.
        ctx.fillRect(
          Math.floor(star.x * width),
          Math.floor(star.y * height),
          star.size,
          star.size,
        );
      }
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      // Repaint immediately so a resize while paused/static isn't left blank.
      paint();
    };
    resize();
    window.addEventListener("resize", resize);

    // Respect the user's reduced-motion preference (the site flattens all other
    // motion globally; this JS loop must opt in too). Render one static frame
    // and skip the rAF loop entirely — zero ongoing cost.
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) {
      paint();
      return () => window.removeEventListener("resize", resize);
    }

    const draw = () => {
      for (const star of stars) {
        // Subtle twinkling.
        star.opacity += star.speed;
        if (star.opacity > 1 || star.opacity < 0.1) star.speed *= -1;
      }
      paint();
      rafId = requestAnimationFrame(draw);
    };

    // Pause the loop when the tab is backgrounded (mirrors AsciiBackground) so
    // we don't burn cycles drawing a canvas nobody can see.
    const onVisibility = () => {
      cancelAnimationFrame(rafId);
      if (!document.hidden) rafId = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", onVisibility);

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
