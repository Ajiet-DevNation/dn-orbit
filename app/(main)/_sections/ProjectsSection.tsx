"use client";

import { useCallback, useEffect, useState } from "react";
import { FaGithub } from "react-icons/fa";
import { Card } from "@/components/ui/8bit-card";
import { cn } from "@/lib/utils";
import { PROJECTS, type ProjectData } from "@/constants/projects";
import { SectionHeading } from "./SectionHeading";
import { useDragScrollCarousel } from "./useDragScrollCarousel";

// ─── tuning ──────────────────────────────────────────────────────────────────
const SECTION_VH = 360; // pinned scrub region height
const CARD_W = 720; // card footprint width (px) — large, roughly square
const CARD_H = "min(82vh, 760px)"; // capped to the viewport so it never clips
const GAP = 48; // gap between cards (px)
const STEP = CARD_W + GAP; // one arrow-key / card advance

function statusColor(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "#22c55e";
    case "SHIPPED":
      return "#3b82f6";
    case "WIP":
      return "#f59e0b";
    default:
      return "#888888";
  }
}

// ─── Presentational project card (used in the carousel and the detail view) ───
function ProjectCard({
  project,
  className,
  style,
  onClick,
  interactive,
  cardIndex,
}: {
  project: ProjectData;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  interactive?: boolean;
  cardIndex?: number;
}) {
  const color = statusColor(project.status);
  return (
    <div
      className={cn(interactive && "group cursor-pointer", className)}
      style={style}
      data-card-index={cardIndex}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <Card
        className={cn(
          "h-full justify-start gap-0 overflow-hidden border-white/10 py-0 shadow-[0_0_15px_rgba(34,197,94,0.04)] transition-[box-shadow,border-color] duration-300",
          interactive &&
            "group-hover:border-[#22c55e]/50 group-hover:shadow-[0_0_34px_rgba(34,197,94,0.2)]"
        )}
      >
        {/* Title bar */}
        <div className="flex items-center justify-between gap-3 border-b-[6px] border-white/10 px-5 py-4">
          <h3 className="retro truncate text-sm text-white">{project.title}</h3>
          <span
            className="retro shrink-0 border-2 px-2 py-1 text-[7px]"
            style={{ color, borderColor: color }}
          >
            {project.status}
          </span>
        </div>

        {/* Picture — fills the rest of the card. Plain <img> (pixelated) for
            arbitrary URLs; pixel placeholder when none. */}
        <div className="relative flex-1 overflow-hidden bg-[#0d0d0d]">
          {project.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.imageUrl}
              alt={project.title}
              loading="lazy"
              className={cn(
                "pixelated h-full w-full object-cover transition-transform duration-500 ease-out",
                interactive && "group-hover:scale-105"
              )}
            />
          ) : (
            <div className="dot-grid-bg flex h-full w-full items-center justify-center">
              <span className="retro text-6xl text-[#22c55e]/25 select-none">
                {project.title.trim()[0] ?? "?"}
              </span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ─── Detail panel (slides in on the right when a card is opened) ──────────────
function ProjectDetail({
  project,
  open,
}: {
  project: ProjectData;
  open: boolean;
}) {
  const color = statusColor(project.status);
  return (
    <div
      className="flex w-full max-w-xl flex-col gap-6"
      style={{
        opacity: open ? 1 : 0,
        transform: `translateX(${open ? 0 : 40}px)`,
        transition:
          "opacity 400ms var(--ease-out-quart), transform 400ms var(--ease-out-quart)",
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="retro border-2 px-2 py-1 text-[8px]"
          style={{ color, borderColor: color }}
        >
          {project.status}
        </span>
        <h3 className="retro text-2xl text-white">{project.title}</h3>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {project.description}
      </p>

      <div className="flex flex-col gap-3">
        <span className="retro text-[10px] tracking-wider text-[#22c55e]">
          TECH STACK
        </span>
        <div className="flex flex-wrap gap-2">
          {project.techStack.map((tech) => (
            <span
              key={tech}
              className="retro border-2 border-white/15 px-2.5 py-1.5 text-[8px] text-white/80"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      {project.githubUrl && (
        <a
          href={project.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="retro inline-flex w-fit cursor-pointer items-center gap-2 border-2 border-[#22c55e] px-4 py-3 text-[9px] text-[#22c55e] transition-colors duration-200 hover:bg-[#22c55e] hover:text-[#0a0a0a]"
        >
          <FaGithub className="size-4" />
          VIEW ON GITHUB
        </a>
      )}
    </div>
  );
}

export function ProjectsSection() {
  // Detail view (React state — only changes on open/close, never per frame).
  const [selected, setSelected] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Carousel mechanics (scroll-link + drag + arrow keys) live in the shared hook.
  // Disabled while a detail view is open so the hidden carousel can't be dragged.
  const { sectionRef, viewportRef, trackRef, onPointerDown, didDrag } =
    useDragScrollCarousel({ step: STEP, disabled: selected !== null });

  const open = (index: number) => {
    if (didDrag()) return; // it was a drag, not a tap
    setSelected(index);
    requestAnimationFrame(() => setDetailOpen(true));
  };
  const close = useCallback(() => {
    setDetailOpen(false);
    window.setTimeout(() => setSelected(null), 360);
  }, []);

  // Escape closes the detail view.
  useEffect(() => {
    if (selected === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, close]);

  const activeProject = selected !== null ? PROJECTS[selected] : null;

  return (
    <section
      ref={sectionRef}
      id="projects"
      className="relative w-full scroll-mt-24"
      style={{ height: `${SECTION_VH}vh` }}
    >
      <div className="sticky top-0 flex h-screen w-full flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-x-0 top-10 z-10">
          <SectionHeading text="PROJECTS" />
        </div>

        {/* Carousel viewport */}
        <div
          ref={viewportRef}
          className={cn(
            "w-full cursor-grab touch-pan-y select-none overflow-hidden active:cursor-grabbing",
            selected !== null && "pointer-events-none opacity-0"
          )}
          style={{ transition: "opacity 300ms var(--ease-out-quart)" }}
          onPointerDown={onPointerDown}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            ref={trackRef}
            className="flex w-max items-center px-[8vw] will-change-transform"
            style={{ gap: GAP }}
          >
            {PROJECTS.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                interactive
                onClick={() => open(i)}
                className="shrink-0"
                style={{
                  width: CARD_W,
                  height: CARD_H,
                }}
              />
            ))}
          </div>
        </div>

        {/* Hint */}
        <p
          className="retro absolute bottom-8 z-10 text-[8px] text-muted-foreground/60"
          style={{
            opacity: selected !== null ? 0 : 1,
            transition: "opacity 300ms var(--ease-out-quart)",
          }}
        >
          SCROLL · DRAG · ◀ ▶ — CLICK A CARD FOR DETAILS
        </p>

        {/* Detail overlay */}
        {activeProject && (
          <div className="absolute inset-0 z-20 flex items-center justify-center gap-8 px-[6%] lg:gap-16">
            <button
              onClick={close}
              aria-label="Close project details"
              className="retro absolute right-8 top-8 cursor-pointer border-2 border-white/20 px-3 py-2 text-xs text-white/70 transition-colors duration-200 hover:border-[#22c55e] hover:text-[#22c55e]"
            >
              ✕
            </button>

            <ProjectCard
              project={activeProject}
              className="shrink-0"
              style={{
                width: "min(42vw, 560px)",
                height: "min(74vh, 680px)",
                opacity: detailOpen ? 1 : 0,
                // Slides in from the right toward its resting place on the left.
                transform: `translateX(${detailOpen ? 0 : 80}px)`,
                transition:
                  "opacity 400ms var(--ease-out-quart), transform 450ms var(--ease-out-quart)",
              }}
            />

            <ProjectDetail project={activeProject} open={detailOpen} />
          </div>
        )}
      </div>
    </section>
  );
}
