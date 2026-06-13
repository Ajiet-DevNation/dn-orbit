"use client";

import { motion } from "framer-motion";
import type { ButtonVariant } from "@/types";

interface AnimatedButtonProps {
  label: string;
  href?: string;
  variant?: ButtonVariant;
  onClick?: () => void;
  className?: string;
}

/**
 * AnimatedButton — Modern interactive CTA button.
 * Renders as <a> when `href` is provided, otherwise <button>.
 *
 * "filled" variant: vibrant accent background.
 * "outlined" variant: glassmorphic outlined style.
 */
export function AnimatedButton({
  label,
  href,
  variant = "outlined",
  onClick,
  className = "",
}: AnimatedButtonProps) {
  const baseClasses =
    "relative overflow-hidden rounded-full px-8 py-3 font-body font-semibold text-sm transition-all duration-300 active:scale-95 flex items-center justify-center gap-2";

  const variantClasses =
    variant === "filled"
      ? "bg-accent text-white shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_30px_rgba(14,165,233,0.6)] hover:bg-accent-hover"
      : "bg-surface-2/50 backdrop-blur-md border border-border text-white hover:border-accent hover:text-accent hover:shadow-[0_0_15px_rgba(14,165,233,0.2)]";

  const classes = `${baseClasses} ${variantClasses} ${className}`;

  if (href) {
    return (
      <motion.a
        href={href}
        className={classes}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.95 }}
      >
        {label}
      </motion.a>
    );
  }

  return (
    <motion.button
      className={classes}
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
    >
      {label}
    </motion.button>
  );
}
