import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

interface PageShellProps {
  children: ReactNode;
}

/**
 * PageShell — Wraps Navbar + page content + Footer.
 * Provides consistent full-height layout structure.
 * Main content area has z-10 to sit above the DotGridBackground.
 */
export function PageShell({ children }: PageShellProps) {
  return (
    <>
      <Navbar />
      <main className="relative z-10 flex-1">{children}</main>
      <Footer />
    </>
  );
}
