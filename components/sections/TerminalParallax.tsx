"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import { TERMINAL_MEMBERS, TERMINAL_PROJECTS } from "@/constants/terminalData";
import type { TerminalMember, TerminalProject } from "@/constants/terminalData";

/* ── Constants ── */
const CMD_1 = "> ls members";
const CMD_2 = "> ls projects";

/* ══════════════════════════════════════════════════
   SUB-COMPONENTS
   ══════════════════════════════════════════════════ */

/** macOS-style traffic light dots — purely decorative */
function TrafficLights() {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
      <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
      <span className="h-3 w-3 rounded-full bg-[#28c840]" />
    </div>
  );
}

/** Member card with avatar, role, bio, and social link. Jumpy hover via Framer Motion. */
function MemberCard({
  member,
  visible,
}: {
  member: TerminalMember;
  visible: boolean;
}) {
  const statusColor =
    member.status === "active"
      ? "bg-[#28c840]"
      : member.status === "idle"
        ? "bg-[#febc2e]"
        : "bg-[#555]";

  return (
    <motion.a
      href={member.social}
      target="_blank"
      rel="noopener noreferrer"
      className="block cursor-pointer border border-border/50 bg-surface-2/50 p-4 backdrop-blur-sm transition-colors hover:bg-surface-2"
      style={{
        borderRadius: "10px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
      whileHover={{ y: -6, scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {/* Top row: avatar + name + status */}
      <div className="flex items-center gap-3">
        <Image
          src={member.avatar}
          alt={member.name}
          width={40}
          height={40}
          className="h-10 w-10 border border-border/30 bg-surface"
          style={{ borderRadius: "8px" }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="font-heading text-sm tracking-wide text-white">
              {member.name}
            </span>
            <span
              className={`${statusColor} h-2 w-2 shrink-0`}
              style={{ borderRadius: "50%" }}
            />
          </div>
          <p className="font-mono text-[10px] uppercase text-accent">
            {member.role}
          </p>
        </div>
      </div>

      {/* Bio */}
      <p className="mt-3 font-mono text-[10px] leading-relaxed text-text-muted">
        {member.bio}
      </p>

      {/* Footer: handle + link icon */}
      <div className="mt-3 flex items-center justify-between border-t border-border/30 pt-2">
        <span className="font-mono text-[10px] text-text-muted">
          {member.handle}
        </span>
        <ExternalLink className="h-3 w-3 text-text-muted" />
      </div>
    </motion.a>
  );
}

/** Project card with image, description, tech stack, and repo link. Jumpy hover. */
function ProjectCard({
  project,
  visible,
}: {
  project: TerminalProject;
  visible: boolean;
}) {
  const statusStyles =
    project.status === "stable"
      ? "text-[#28c840] border-[#28c840]/40"
      : project.status === "experimental"
        ? "text-[#febc2e] border-[#febc2e]/40"
        : "text-text-muted border-text-muted/40";

  return (
    <motion.a
      href={project.repoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block cursor-pointer overflow-hidden border border-border/50 bg-surface-2/50 backdrop-blur-sm transition-colors hover:bg-surface-2"
      style={{
        borderRadius: "10px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
      whileHover={{ y: -6, scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {/* Project image */}
      <div className="flex h-28 items-center justify-center bg-surface/80 p-4">
        <Image
          src={project.image}
          alt={project.name}
          width={64}
          height={64}
          className="h-16 w-16 opacity-60"
        />
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="font-heading text-base tracking-wide text-white">
            {project.name}
          </span>
          <span
            className={`${statusStyles} border px-2 py-0.5 font-mono text-[9px] uppercase`}
            style={{ borderRadius: "4px" }}
          >
            {project.status}
          </span>
        </div>

        <p className="mt-2 font-mono text-[10px] leading-relaxed text-text-muted">
          {project.description}
        </p>

        {/* Tech stack */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {project.tech.map((t) => (
            <span
              key={t}
              className="bg-surface/80 px-2 py-0.5 font-mono text-[9px] uppercase text-text-muted"
              style={{ borderRadius: "4px" }}
            >
              {t}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between border-t border-border/30 pt-2">
          <span className="font-mono text-[9px] uppercase text-text-muted">
            VIEW_REPOSITORY →
          </span>
          <ExternalLink className="h-3 w-3 text-text-muted" />
        </div>
      </div>
    </motion.a>
  );
}

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════ */

/**
 * TerminalParallax — Scroll-driven parallax terminal effect.
 *
 * macOS-style terminal with rounded corners, traffic light dots,
 * generous spacing, and jumpy hover effects on cards.
 *
 * Timeline:
 *   0–8%   → Terminal fades in
 *   8–30%  → "ls members" types char by char
 *   30–60% → Member cards stagger in
 *   60–75% → "ls projects" types char by char
 *   75–100% → Project cards stagger in
 */
export function TerminalParallax() {
  const containerRef = useRef<HTMLDivElement>(null);

  const [terminalVisible, setTerminalVisible] = useState(false);
  const [cmd1Chars, setCmd1Chars] = useState(0);
  const [cmd2Chars, setCmd2Chars] = useState(0);
  const [membersProgress, setMembersProgress] = useState(0);
  const [projectsProgress, setProjectsProgress] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v: number) => {
    setTerminalVisible(v >= 0.04);

    // Command 1 typing (8% → 30%)
    if (v < 0.08) {
      setCmd1Chars(0);
    } else if (v > 0.3) {
      setCmd1Chars(CMD_1.length);
    } else {
      setCmd1Chars(Math.floor(((v - 0.08) / 0.22) * CMD_1.length));
    }

    // Members reveal (30% → 60%)
    if (v < 0.3) {
      setMembersProgress(0);
    } else if (v > 0.6) {
      setMembersProgress(1);
    } else {
      setMembersProgress((v - 0.3) / 0.3);
    }

    // Command 2 typing (60% → 75%)
    if (v < 0.6) {
      setCmd2Chars(0);
    } else if (v > 0.75) {
      setCmd2Chars(CMD_2.length);
    } else {
      setCmd2Chars(Math.floor(((v - 0.6) / 0.15) * CMD_2.length));
    }

    // Projects reveal (75% → 100%)
    if (v < 0.75) {
      setProjectsProgress(0);
    } else {
      setProjectsProgress(Math.min(1, (v - 0.75) / 0.25));
    }
  });

  const isCardVisible = (progress: number, index: number, total: number) => {
    return progress > index / total;
  };

  return (
    <section ref={containerRef} className="relative min-h-[400vh]">
      <div className="sticky top-[5vh] flex h-[90vh] items-start justify-center px-4 md:px-8">
        <div
          className="w-full transition-all duration-700"
          style={{
            maxWidth: "90%",
            opacity: terminalVisible ? 1 : 0,
            transform: terminalVisible ? "translateY(0)" : "translateY(60px)",
          }}
        >
          {/* ── Terminal Chrome: Title Bar ── */}
          <div
            className="flex items-center gap-4 bg-surface-2 px-5 py-3"
            style={{
              borderTopLeftRadius: "12px",
              borderTopRightRadius: "12px",
            }}
          >
            <TrafficLights />
            <div className="flex flex-1 items-center justify-center">
              <span className="font-mono text-[11px] tracking-widest text-text-muted">
                ORBIT_TERMINAL — v1.0
              </span>
            </div>
            {/* Spacer to balance the traffic lights */}
            <div className="w-[52px]" />
          </div>

          {/* ── Terminal Body ── */}
          <div
            className="overflow-y-auto border border-t-0 border-border/30 bg-bg/95 p-8 backdrop-blur-sm"
            style={{
              borderBottomLeftRadius: "12px",
              borderBottomRightRadius: "12px",
              minHeight: "60vh",
              maxHeight: "78vh",
            }}
          >
            {/* System welcome message */}
            <div className="mb-6 font-mono text-xs text-text-muted">
              <span className="text-accent">[SYSTEM]</span>{" "}
              <span className="text-text-muted/70">
                CONNECTION_ESTABLISHED — NAVIGATE ARCHIVE WITH COMMANDS
              </span>
            </div>
            <div className="mb-8 border-t border-border/20" />

            {/* ── CMD 1: ls members ── */}
            {cmd1Chars > 0 && (
              <div className="font-mono text-sm text-accent">
                <span>{CMD_1.slice(0, cmd1Chars)}</span>
                {cmd1Chars < CMD_1.length && (
                  <span className="cursor-blink ml-0.5">▊</span>
                )}
              </div>
            )}

            {/* ── Output 1: Members ── */}
            {membersProgress > 0 && (
              <div
                className="transition-opacity duration-300"
                style={{ opacity: Math.min(1, membersProgress * 3) }}
              >
                <div className="mb-3 mt-5 font-mono text-[10px] uppercase tracking-wider text-text-muted/60">
                  FOUND {TERMINAL_MEMBERS.length} RECORDS IN
                  /ARCHIVE/MEMBERS
                </div>
                <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {TERMINAL_MEMBERS.map((member, i) => (
                    <MemberCard
                      key={member.handle}
                      member={member}
                      visible={isCardVisible(
                        membersProgress,
                        i,
                        TERMINAL_MEMBERS.length
                      )}
                    />
                  ))}
                </div>
                <div className="mb-8 border-t border-border/20" />
              </div>
            )}

            {/* ── CMD 2: ls projects ── */}
            {cmd2Chars > 0 && (
              <div className="font-mono text-sm text-accent">
                <span>{CMD_2.slice(0, cmd2Chars)}</span>
                {cmd2Chars < CMD_2.length && (
                  <span className="cursor-blink ml-0.5">▊</span>
                )}
              </div>
            )}

            {/* ── Output 2: Projects ── */}
            {projectsProgress > 0 && (
              <div
                className="transition-opacity duration-300"
                style={{ opacity: Math.min(1, projectsProgress * 3) }}
              >
                <div className="mb-3 mt-5 font-mono text-[10px] uppercase tracking-wider text-text-muted/60">
                  FOUND {TERMINAL_PROJECTS.length} RECORDS IN
                  /ARCHIVE/PROJECTS
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {TERMINAL_PROJECTS.map((project, i) => (
                    <ProjectCard
                      key={project.name}
                      project={project}
                      visible={isCardVisible(
                        projectsProgress,
                        i,
                        TERMINAL_PROJECTS.length
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
