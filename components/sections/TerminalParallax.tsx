"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useMotionValueEvent, type MotionValue } from "framer-motion";
import { TERMINAL_MEMBERS, TERMINAL_PROJECTS } from "@/constants/terminalData";
import type { TerminalMember, TerminalProject } from "@/constants/terminalData";

/* ── Constants ── */
const CMD_1 = "> ls members";
const CMD_2 = "> ls projects";

/* ── Sub-components ── */

function TerminalDots() {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-3 bg-[#ef4444]" />
      <span className="h-3 w-3 bg-[#eab308]" />
      <span className="h-3 w-3 bg-accent" />
    </div>
  );
}

function MemberCard({ member, visible }: { member: TerminalMember; visible: boolean }) {
  const statusColor =
    member.status === "active"
      ? "bg-accent"
      : member.status === "idle"
        ? "bg-[#eab308]"
        : "bg-[#555]";

  return (
    <div
      className="border border-dashed border-border bg-surface p-3 transition-all duration-500 hover:bg-surface-2"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="font-heading text-sm tracking-wide text-white">
          {member.name}
        </span>
        <span className={`${statusColor} h-2 w-2`} />
      </div>
      <p className="mt-1 font-mono text-[10px] uppercase text-accent">
        {member.role}
      </p>
      <p className="mt-0.5 font-mono text-[10px] text-text-muted">
        {member.handle}
      </p>
    </div>
  );
}

function ProjectCard({ project, visible }: { project: TerminalProject; visible: boolean }) {
  const statusColor =
    project.status === "stable"
      ? "text-accent border-accent"
      : project.status === "experimental"
        ? "text-[#f97316] border-[#f97316]"
        : "text-text-muted border-text-muted";

  return (
    <div
      className="border border-dashed border-border bg-surface p-4 transition-all duration-500 hover:bg-surface-2"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="font-heading text-base tracking-wide text-white">
          {project.name}
        </span>
        <span
          className={`${statusColor} border border-dashed px-2 py-0.5 font-mono text-[9px] uppercase`}
        >
          {project.status}
        </span>
      </div>
      <p className="mt-2 font-mono text-[11px] leading-relaxed text-text-muted">
        {project.description}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {project.tech.map((t) => (
          <span
            key={t}
            className="bg-surface-2 px-2 py-0.5 font-mono text-[9px] uppercase text-text-muted"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ── */

/**
 * TerminalParallax — Scroll-driven parallax terminal effect.
 *
 * Uses useMotionValueEvent to read scroll progress and drive React state,
 * avoiding complex MotionValue chaining that causes TS issues.
 *
 * Timeline:
 *   0–10%  → Terminal fades in
 *   10–35% → "ls members" types char by char
 *   35–65% → Member cards stagger in
 *   65–80% → "ls projects" types char by char
 *   80–100% → Project cards stagger in
 */
export function TerminalParallax() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Simple state instead of complex MotionValue chains
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [cmd1Chars, setCmd1Chars] = useState(0);
  const [cmd2Chars, setCmd2Chars] = useState(0);
  const [membersProgress, setMembersProgress] = useState(0);
  const [projectsProgress, setProjectsProgress] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Single event handler maps scroll progress to all state
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    // Terminal visibility (0 → 10%)
    setTerminalVisible(v >= 0.05);

    // Command 1 typing (10% → 35%)
    if (v < 0.1) {
      setCmd1Chars(0);
    } else if (v > 0.35) {
      setCmd1Chars(CMD_1.length);
    } else {
      const progress = (v - 0.1) / 0.25;
      setCmd1Chars(Math.floor(progress * CMD_1.length));
    }

    // Members reveal (35% → 65%)
    if (v < 0.35) {
      setMembersProgress(0);
    } else if (v > 0.65) {
      setMembersProgress(1);
    } else {
      setMembersProgress((v - 0.35) / 0.3);
    }

    // Command 2 typing (65% → 80%)
    if (v < 0.65) {
      setCmd2Chars(0);
    } else if (v > 0.8) {
      setCmd2Chars(CMD_2.length);
    } else {
      const progress = (v - 0.65) / 0.15;
      setCmd2Chars(Math.floor(progress * CMD_2.length));
    }

    // Projects reveal (80% → 100%)
    if (v < 0.8) {
      setProjectsProgress(0);
    } else {
      setProjectsProgress(Math.min(1, (v - 0.8) / 0.2));
    }
  });

  // Stagger helper: each card appears slightly after the previous
  const isCardVisible = (progress: number, index: number, total: number) => {
    const threshold = index / total;
    return progress > threshold;
  };

  return (
    <section ref={containerRef} className="relative min-h-[400vh]">
      {/* Sticky terminal window */}
      <div className="sticky top-[5vh] flex h-[90vh] items-start justify-center px-6 md:px-12 lg:px-24">
        <div
          className="w-full max-w-4xl transition-all duration-700"
          style={{
            opacity: terminalVisible ? 1 : 0,
            transform: terminalVisible ? "translateY(0)" : "translateY(60px)",
          }}
        >
          {/* Terminal chrome — title bar */}
          <div className="flex items-center justify-between border border-dashed border-border bg-surface px-4 py-3">
            <TerminalDots />
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
              ORBIT_TERMINAL v1.0
            </span>
            <span className="font-mono text-[10px] text-text-muted">
              SESSION_ACTIVE
            </span>
          </div>

          {/* Terminal body */}
          <div className="border border-t-0 border-dashed border-border bg-bg p-6 min-h-[70vh] overflow-y-auto max-h-[80vh]">
            {/* Welcome line */}
            <div className="mb-4 font-mono text-[11px] text-text-muted">
              <span className="text-accent">[SYSTEM]</span>{" "}
              CONNECTION_ESTABLISHED — TYPE COMMANDS TO NAVIGATE ARCHIVE
            </div>
            <div className="mb-6 border-t border-dashed border-border" />

            {/* ── Command 1: ls members ── */}
            {cmd1Chars > 0 && (
              <div className="font-mono text-sm text-accent">
                <span>{CMD_1.slice(0, cmd1Chars)}</span>
                {cmd1Chars < CMD_1.length && (
                  <span className="cursor-blink ml-0.5">▊</span>
                )}
              </div>
            )}

            {/* ── Output 1: Member grid ── */}
            {membersProgress > 0 && (
              <div
                className="transition-opacity duration-300"
                style={{ opacity: Math.min(1, membersProgress * 3) }}
              >
                <div className="mb-2 mt-4 font-mono text-[10px] uppercase text-text-muted">
                  FOUND {TERMINAL_MEMBERS.length} RECORDS IN /ARCHIVE/MEMBERS
                </div>
                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {TERMINAL_MEMBERS.map((member, i) => (
                    <MemberCard
                      key={member.handle}
                      member={member}
                      visible={isCardVisible(membersProgress, i, TERMINAL_MEMBERS.length)}
                    />
                  ))}
                </div>
                <div className="mb-6 border-t border-dashed border-border" />
              </div>
            )}

            {/* ── Command 2: ls projects ── */}
            {cmd2Chars > 0 && (
              <div className="font-mono text-sm text-accent">
                <span>{CMD_2.slice(0, cmd2Chars)}</span>
                {cmd2Chars < CMD_2.length && (
                  <span className="cursor-blink ml-0.5">▊</span>
                )}
              </div>
            )}

            {/* ── Output 2: Project grid ── */}
            {projectsProgress > 0 && (
              <div
                className="transition-opacity duration-300"
                style={{ opacity: Math.min(1, projectsProgress * 3) }}
              >
                <div className="mb-2 mt-4 font-mono text-[10px] uppercase text-text-muted">
                  FOUND {TERMINAL_PROJECTS.length} RECORDS IN /ARCHIVE/PROJECTS
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {TERMINAL_PROJECTS.map((project, i) => (
                    <ProjectCard
                      key={project.name}
                      project={project}
                      visible={isCardVisible(projectsProgress, i, TERMINAL_PROJECTS.length)}
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
