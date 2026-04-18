"use client";

import { motion } from "framer-motion";
import { PageShell } from "@/components/layout/PageShell";
import { ArchiveTag } from "@/components/ui/ArchiveTag";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PolaroidCard } from "@/components/ui/PolaroidCard";
import { StampLabel } from "@/components/ui/StampLabel";
import { ArchiveBadge } from "@/components/ui/ArchiveBadge";
import { RepoRow } from "@/components/ui/RepoRow";

import { TerminalParallax } from "@/components/sections/TerminalParallax";

/**
 * Home page — CLUB HUB (ARCHIVE)
 *
 * This is a showcase page that demonstrates all the global UI components
 * working together. In production, the sections will pull real data from
 * the API. For now it uses static content to verify the design system.
 *
 * Client Component for Framer Motion page transitions.
 */

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const sampleRepos = [
  {
    name: "TACTICAL-GRID-OS",
    description: "A lightweight dashboard for managing archive datasets",
    stars: 194,
    forks: 17,
    status: "stable" as const,
  },
  {
    name: "MEMBER-REGISTRY-V3",
    description: "New member onboarding system with encrypted log-ins",
    stars: 63,
    forks: 5,
    status: "experimental" as const,
  },
  {
    name: "CLI-TOOLKIT-CORE",
    description: "Custom terminal commands for common archival tasks",
    stars: 87,
    forks: 15,
    status: "stable" as const,
  },
];

export default function Home() {
  return (
    <PageShell>
      {/* ── Hero Section ── */}
      <section className="px-6 pb-16 pt-12 md:px-12 lg:px-24">
        <motion.div
          initial="hidden"
          animate="visible"
          className="max-w-3xl"
        >
          <motion.div custom={0} variants={fadeUp}>
            <ArchiveTag label="TACTICAL_ENTRY_001" />
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="mt-6 font-heading text-6xl uppercase leading-none tracking-tight text-white md:text-8xl lg:text-9xl"
          >
            CLUB HUB
            <br />
            <span className="text-transparent [-webkit-text-stroke:2px_white]">
              (ARCHIVE)
            </span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            className="mt-6 max-w-md font-mono text-sm leading-relaxed text-text-muted"
          >
            Terminal interface for the DevNation collective. Access
            encrypted project logs, member databases, and upcoming tactical
            events.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            className="mt-8 flex flex-wrap gap-4"
          >
            <TerminalButton
              label="VIEW_SOURCE"
              href="/repositories"
              variant="outlined"
            />
            <TerminalButton
              label="DATA_LOGS"
              href="/logs"
              variant="filled"
            />
          </motion.div>
        </motion.div>

        {/* Metadata line */}
        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-12 font-mono text-[10px] uppercase tracking-widest text-text-muted"
        >
          DATE: 2024.11.02 · STATUS: VERIFIED · LOC: SECTOR_7 · API_ONLINE: 100%
          · LABS_AVAILABLE
        </motion.div>
      </section>

      {/* ── Parallax Terminal Section ── */}
      <TerminalParallax />

      {/* ── Project Showcase Section ── */}
      <section className="px-6 py-12 md:px-12 lg:px-24">
        <SectionHeader label="PROJECT_SHOWCASE" path="/root/drive/projects" />

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative">
              <PolaroidCard
                title="KERNEL_PANIC_V2"
                author="@EV0_A2"
                date="DEC_2023"
                image="/globe.svg"
              >
                <StampLabel
                  label="VERIFIED"
                  variant="verified"
                  rotate={-8}
                  className="bottom-4 left-4"
                />
              </PolaroidCard>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <PolaroidCard
              title="GHOST_ENCRYPT"
              author="@CIPHER"
              date="JAN_2024"
              image="/file.svg"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="relative">
              <PolaroidCard
                title="NEURAL_VAULT"
                author="@MATRIX"
                date="FEB_2024"
                image="/window.svg"
              >
                <StampLabel
                  label="CONFIDENTIAL"
                  variant="confidential"
                  rotate={6}
                  className="right-4 top-4"
                />
              </PolaroidCard>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <PolaroidCard
              title="LEGACY_SHELL"
              author="@ROOT"
              date="MAR_2024"
              image="/next.svg"
            />
          </motion.div>
        </div>
      </section>

      {/* ── Shared Repositories Section ── */}
      <section className="px-6 py-12 md:px-12 lg:px-24">
        <SectionHeader
          label="SHARED_REPOSITORIES"
          path="/root/repos"
        />

        <div className="mt-8 flex flex-col gap-3">
          {sampleRepos.map((repo) => (
            <motion.div
              key={repo.name}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <RepoRow repo={repo} />
            </motion.div>
          ))}
        </div>
      </section>

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
