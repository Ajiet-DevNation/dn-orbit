"use client";

import { motion } from "framer-motion";
import { PageShell } from "@/components/layout/PageShell";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { ArchiveBadge } from "@/components/ui/ArchiveBadge";

import { OrbitIntro } from "@/components/sections/OrbitIntro";
import { TerminalParallax } from "@/components/sections/TerminalParallax";

/**
 * Home page — ORBIT Landing
 *
 * Structure:
 *   1. OrbitIntro — Cinematic brand animation (full-screen)
 *   2. TerminalParallax — Scroll-driven terminal with members/projects
 *   3. Join CTA — Call-to-action to join the collective
 *
 * Client Component for Framer Motion animations.
 */

export default function Home() {
  const { data: session } = useSession();

  return (
    <PageShell>
      {/* ── Cinematic Brand Intro ── */}
      <OrbitIntro
        assets={[
          "https://api.dicebear.com/9.x/shapes/svg?seed=orbit1",
          "https://api.dicebear.com/9.x/shapes/svg?seed=orbit2",
          "https://api.dicebear.com/9.x/shapes/svg?seed=orbit3",
        ]}
      />

      {/* ── Parallax Terminal Section ── */}
      <TerminalParallax />

      {/* ── Join CTA Section ── */}
      <section className="relative overflow-hidden px-6 py-24 md:px-12 lg:px-24">
        {/* Background repeating text */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.04]"
          aria-hidden="true"
        >
          <p className="whitespace-nowrap font-heading text-[120px] uppercase leading-none tracking-tight text-white md:text-[180px]">
            JOIN THE COLLECTIVE JOIN THE COLLECTIVE JOIN THE COLLECTIVE
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative z-10 mx-auto max-w-lg text-center"
        >
          <ArchiveBadge
            label="INITIATE_SESSION"
            variant="urgent"
            className="mb-4"
          />
          <h2 className="font-heading text-5xl uppercase tracking-tight text-white md:text-6xl">
            JOIN THE COLLECTIVE
          </h2>
          <p className="mt-3 font-mono text-xs uppercase tracking-widest text-text-muted">
            CLICK TO INITIALIZE MEMBERSHIP
          </p>
          <div className="mt-6">
            <TerminalButton
              label="INITIATE_CONNECTION"
              href="/login"
              variant="filled"
            />
          </div>
        </motion.div>
      </section>
    </PageShell>
  );
}