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

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      stars.forEach((star) => {
        // Subtle twinkling
        star.opacity += star.speed;
        if (star.opacity > 1 || star.opacity < 0.1) {
          star.speed *= -1;
        }

        const currentOpacity = Math.max(0, Math.min(1, star.opacity)) * 0.6;
        ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
        
        // Ensure pixel alignment by flooring coordinates
        ctx.fillRect(
          Math.floor(star.x * width),
          Math.floor(star.y * height),
          star.size,
          star.size
        );
      });

      rafId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
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
