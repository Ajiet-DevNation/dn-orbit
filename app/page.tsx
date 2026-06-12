"use client";

import { OrbitIntro } from "@/components/sections/OrbitIntro";
import { TerminalParallax } from "@/components/sections/TerminalParallax";
import { AboutSection } from "@/components/sections/AboutSection";
import { ContactSection } from "@/components/sections/ContactSection";

/**
 * Home page — ORBIT Landing
 *
 * Structure:
 *   1. OrbitIntro — Cinematic brand animation (full-screen) + Join CTA
 *   2. AboutSection — Club overview with image placeholder
 *   3. TerminalParallax — Scroll-driven terminal with members/projects
 *   4. ContactSection — Contact info grid
 *
 * No Navbar or Footer on the landing page — minimalist, distraction-free.
 * Client Component for Framer Motion animations.
 */

export default function Home() {
  return (
    <main className="relative z-10 flex-1">
      {/* ── Cinematic Brand Intro + Join CTA ── */}
      <OrbitIntro
        assets={[
          "https://api.dicebear.com/9.x/shapes/svg?seed=orbit1",
          "https://api.dicebear.com/9.x/shapes/svg?seed=orbit2",
          "https://api.dicebear.com/9.x/shapes/svg?seed=orbit3",
        ]}
      />

      {/* ── About Section ── */}
      <AboutSection />

      {/* ── Parallax Terminal Section ── */}
      <TerminalParallax />

      {/* ── Contact Section ── */}
      <ContactSection />
    </main>
  );
}
