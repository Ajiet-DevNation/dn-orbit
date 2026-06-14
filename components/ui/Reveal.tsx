"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Vertical travel in px for the fade-up. */
  y?: number;
  /** Delay before the reveal starts, in seconds. */
  delay?: number;
}

/**
 * Subtle, once-only fade-up as the element scrolls into view. Honours
 * prefers-reduced-motion (renders static). Keeps the 8-bit theme — this only
 * eases entrances, it doesn't add any decorative motion.
 */
export function Reveal({ children, className, y = 24, delay = 0 }: RevealProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
