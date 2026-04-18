"use client";

import { motion } from "framer-motion";
import type { ButtonVariant } from "@/types";

interface TerminalButtonProps {
  label: string;
  href?: string;
  variant?: ButtonVariant;
  onClick?: () => void;
  className?: string;
}

/**
 * TerminalButton — Sharp rectangular CTA button with dashed border.
 * Renders as <a> when `href` is provided, otherwise <button>.
 * Uses Framer Motion for a subtle scale-down on tap.
 *
 * "filled" variant: white background + dark text.
 * "outlined" variant: transparent background + white border + white text.
 */
export function TerminalButton({
  label,
  href,
  variant = "outlined",
  onClick,
  className = "",
}: TerminalButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center gap-2 border-2 border-dashed px-6 py-3 font-heading text-sm uppercase tracking-widest transition-colors";

  const variantClasses =
    variant === "filled"
      ? "border-white bg-white text-bg hover:bg-text-muted hover:border-text-muted"
      : "border-border bg-transparent text-white hover:border-white hover:bg-white/5";

  const classes = `${baseClasses} ${variantClasses} ${className}`;

  if (href) {
    return (
      <motion.a
        href={href}
        className={classes}
        whileTap={{ scale: 0.97 }}
      >
        {label}
      </motion.a>
    );
  }

  return (
    <motion.button
      className={classes}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
    >
      {label}
    </motion.button>
  );
}
