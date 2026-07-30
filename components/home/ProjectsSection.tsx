"use client";

import { memo, useMemo, useRef } from "react";
import { FaExternalLinkAlt, FaGithub } from "react-icons/fa";
import { Button } from "@/components/ui/8bit-button";
import { Card } from "@/components/ui/8bit-card";
import { Progress } from "@/components/ui/8bit-progress";
import {
  DetailOverlay,
  DetailOverlayContent,
} from "@/components/ui/DetailOverlay";
import type { ProjectData } from "@/constants/projects";
import { useCardPowerOn } from "@/hooks/useCardPowerOn";
import { useCoverflow } from "@/hooks/useCoverflow";
import { useFlipDetail } from "@/hooks/useFlipDetail";
import { useScrollGlide } from "@/hooks/useScrollGlide";
import { cn } from "@/lib/utils";
import { HudCardFrame } from "./HudCardFrame";
import { SectionHeading } from "./SectionHeading";
import { TECH_BY_NAME } from "./techStack";

// Read-only tech chip: dark background + green pixel border + green tech icon,
// matching the chips in the "new project" form (TechStackSelect) where the icons
// pop against the dark fill.
const TechChip = memo(function TechChip({ name }: { name: string }) {
  const Icon = TECH_BY_NAME[name]?.Icon;
  return (
    <span className="retro inline-flex items-center gap-2 border-2 border-[#22c55e] bg-[#0a0a0a] px-2.5 py-1.5 text-[9px] text-white">
      {Icon && <Icon className="size-3.5 shrink-0 text-[#22c55e]" />}
      {name}
    </span>
  );
});

import { useViewportWidth } from "@/hooks/useViewportWidth";
import { CoverflowControls, CoverflowFloor } from "./CoverflowControls";

// ─── tuning (desktop reference; scaled to the viewport in the component) ───────
const MAX_CARD_W = 680; // centre-card width (px) on desktop
const CARD_RATIO = 600 / 680; // height / width
const SPREAD_RATIO = 400 / 680; // centre-to-centre gap / width

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

// Progress meter fill, as a Tailwind class rather than a hex value, because the
// shared 8-bit `Progress` takes a className for its filled squares. Kept beside
// statusColor so the two can't drift apart.
function statusFillClass(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-[#22c55e]";
    case "SHIPPED":
      return "bg-[#3b82f6]";
    case "WIP":
      return "bg-[#f59e0b]";
    default:
      return "bg-[#888888]";
  }
}

// ─── Presentational project card (carousel + detail view) ─────────────────────
const ProjectCard = memo(function ProjectCard({
  project,
  className,
  style,
}: {
  project: ProjectData;
  className?: string;
  style?: React.CSSProperties;
}) {
  const color = statusColor(project.status);
  // Up to two alphanumerics for the cartridge monogram, e.g. "CERT GEN" → "CE".
  const monogram =
    project.title
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 2)
      .toUpperCase() || "?";
  return (
    <Card
      className={cn(
        "h-full justify-start gap-0 overflow-hidden border-white/10 py-0 shadow-[0_0_15px_rgba(34,197,94,0.04)]",
        className,
      )}
      style={style}
    >
      <div className="flex items-center justify-between gap-3 border-b-[6px] border-white/10 px-5 py-4">
        <h3 className="retro truncate text-sm text-white">{project.title}</h3>
        <span
          className="retro shrink-0 border-2 px-2 py-1 text-[7px]"
          style={{ color, borderColor: color }}
        >
          {project.status}
        </span>
      </div>

      {/* Picture — fills the rest. Plain <img> (pixelated) or, when a project has
          no cover, a composed "cartridge" fallback so the card never reads empty. */}
      <div className="relative flex-1 overflow-hidden bg-[#0d0d0d]">
        {project.imageUrl ? (
          // biome-ignore lint/performance/noImgElement: arbitrary remote host — next/image would need per-host config
          <img
            src={project.imageUrl}
            alt={project.title}
            loading="lazy"
            // See MembersSection: intrinsic size stops the card reflowing when
            // the bytes land, async decode keeps it off the main thread.
            width={680}
            height={600}
            decoding="async"
            draggable={false}
            className="pixelated h-full w-full object-cover select-none [-webkit-user-drag:none]"
          />
        ) : (
          <div className="dot-grid-bg relative flex h-full w-full flex-col items-center justify-center gap-7 p-8">
            {/* Oversized monogram watermark for depth behind the tile. */}
            <span
              aria-hidden
              className="retro pointer-events-none absolute inset-0 flex items-center justify-center text-[12rem] leading-none text-white/[0.03] select-none"
            >
              {monogram}
            </span>

            {/* Cartridge tile: status-colored pixel border + monogram. */}
            <div
              className="relative z-10 flex size-28 items-center justify-center border-4 bg-[#0a0a0a]"
              style={{ borderColor: color, boxShadow: `0 0 24px ${color}22` }}
            >
              <span className="retro text-4xl text-white select-none">
                {monogram}
              </span>
            </div>

            {/* Tech stack chips — the glanceable substance that fills the card. */}
            {project.techStack.length > 0 && (
              <div className="z-10 flex max-w-[85%] flex-wrap justify-center gap-3">
                {project.techStack.map((tech) => (
                  <TechChip key={tech} name={tech} />
                ))}
              </div>
            )}

            <FaGithub className="z-10 size-5 text-white/20" />
          </div>
        )}

        {/* Completion strip — the lead sets this in the "new project" modal and
            admins maintain it, but it had no public surface at all. Overlaid on
            the artwork so adding it costs the card no height (every card in the
            coverflow is a fixed size). Omitted for scraped projects, which have
            no progress figure. */}
        {project.progressPct != null && (
          <div
            className="absolute inset-x-0 bottom-0 h-1.5 bg-black/60"
            aria-hidden
          >
            <div
              className="h-full transition-[width] duration-500 ease-out"
              style={{
                width: `${Math.max(0, Math.min(100, project.progressPct))}%`,
                backgroundColor: color,
              }}
            />
          </div>
        )}
      </div>
    </Card>
  );
});

// ─── Detail panel (slides in beside the expanded card) ────────────────────────
function ProjectDetail({
  project,
  open,
}: {
  project: ProjectData;
  open: boolean;
}) {
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
      {/* Status badge intentionally omitted here — the card that flies in beside
          this panel already shows it, so repeating it next to the title is
          redundant. min-w-0 + break-words lets a long title wrap cleanly. */}
      <h3 className="retro min-w-0 break-words text-2xl text-white">
        {project.title}
      </h3>

      {/* whitespace-pre-line for the same reason as the event detail panel:
          submitters write multi-paragraph descriptions and collapsing the blank
          lines turned them into a wall of text. */}
      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
        {project.description}
      </p>

      {/* Completion meter — reuses the shared 8-bit Progress primitive so the
          segmented pixel look matches the rest of the site rather than being a
          one-off bar. Fill colour tracks the project status. */}
      {project.progressPct != null && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="retro text-[10px] tracking-wider text-[#22c55e]">
              PROGRESS
            </span>
            <span className="retro text-[10px] text-muted-foreground">
              {project.progressPct}%
            </span>
          </div>
          <Progress
            variant="retro"
            value={project.progressPct}
            progressBg={statusFillClass(project.status)}
            className="h-3"
          />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <span className="retro text-[10px] tracking-wider text-[#22c55e]">
          TECH STACK
        </span>
        <div className="flex flex-wrap gap-3">
          {project.techStack.map((tech) => (
            <TechChip key={tech} name={tech} />
          ))}
        </div>
      </div>

      {(project.githubUrl || project.demoUrl) && (
        <div className="flex flex-wrap gap-4">
          {project.githubUrl && (
            <Button asChild size="sm" className="text-[9px]">
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaGithub className="size-4" />
                VIEW ON GITHUB
              </a>
            </Button>
          )}
          {project.demoUrl && (
            <Button asChild size="sm" className="text-[9px]">
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaExternalLinkAlt className="size-3.5" />
                LIVE DEMO
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function ProjectsSection({ projects }: { projects: ProjectData[] }) {
  // FLIP shared-element transition: the centre card flies from its on-screen
  // rect into the detail slot. Keyed by carousel index.
  const { selected, detailOpen, flipRef, open, close } =
    useFlipDetail<number>();

  // Responsive sizing: cap at the desktop width, otherwise scale to the viewport
  // so the centre card always fits a phone screen.
  const vw = useViewportWidth();
  const CARD_W = Math.min(MAX_CARD_W, Math.round(vw * 0.86));
  const CARD_H = Math.round(CARD_W * CARD_RATIO);
  const SPREAD = Math.round(CARD_W * SPREAD_RATIO);

  // Memoised: a fresh object literal here would give CoverflowControls a new
  // prop identity on every parent render, defeating its own memo() exactly when
  // renders are most expensive — mid-drag.
  const counterStyle = useMemo(
    () => ({
      top: `calc(50% + ${Math.round(CARD_H / 2) + 24}px)`,
      bottom: "auto" as const,
    }),
    [CARD_H],
  );

  // Wrapper the scroll-glide drifts horizontally (left for projects).
  const glideRef = useRef<HTMLDivElement>(null);

  const {
    sectionRef,
    registerCard,
    onCardClick,
    next,
    prev,
    activeIndex,
    settledIndex,
    count,
    stageHandlers,
  } = useCoverflow({
    count: projects.length,
    spread: SPREAD,
    tilt: 30,
    depth: 150,
    autoAdvanceMs: 5200,
    disabled: selected !== null,
    onActivateCenter: open,
  });

  // Scroll-linked horizontal glide: the projects row drifts LEFT as the section
  // travels the viewport. Additive transform on a wrapper, so it composes with
  // (never overwrites) the per-card coverflow transforms.
  useScrollGlide(sectionRef, glideRef, {
    direction: -1,
    distancePx: Math.round(vw * 0.16),
  });

  // GSAP power-on (bracket pop) on the card the row came to rest on — keyed off
  // the SETTLED index, not the live one, so a drag sweeping past ten cards
  // doesn't fire ten bracket animations mid-gesture.
  useCardPowerOn(glideRef, settledIndex);

  const activeProject = selected !== null ? projects[selected] : null;

  return (
    <section
      ref={sectionRef}
      id="projects"
      className="relative flex min-h-screen w-full flex-col overflow-hidden py-20 scroll-mt-24"
    >
      {/* Title gets its own row so the cards never cover it. */}
      <div className="shrink-0 pt-28">
        <SectionHeading text="PROJECTS" />
      </div>

      {/* Coverflow stage. `perspective` makes the per-card rotateY/translateZ
          foreshorten into a true 3D cover-flow that spans the full width. */}
      <div
        className={cn(
          "relative w-full flex-1 cursor-grab touch-pan-y select-none active:cursor-grabbing",
          selected !== null && "pointer-events-none opacity-0",
        )}
        style={{
          transition: "opacity 300ms var(--ease-out-quart)",
          perspective: 1700,
        }}
        {...stageHandlers}
      >
        <CoverflowFloor />
        {/* Glide wrapper: full-size + preserve-3d so the stage's perspective
              still reaches the cards, while GSAP drifts this element on scroll. */}
        <div
          ref={glideRef}
          className="absolute inset-0"
          style={{ transformStyle: "preserve-3d" }}
        >
          {projects.map((project, i) => (
            <div
              key={project.id}
              ref={registerCard(i)}
              data-cf-index={i}
              role="button"
              tabIndex={0}
              onClick={() => onCardClick(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onCardClick(i);
                }
              }}
              className="group absolute left-1/2 top-1/2 cursor-pointer"
              style={{
                width: CARD_W,
                height: CARD_H,
                marginLeft: -CARD_W / 2,
                marginTop: -CARD_H / 2,
              }}
            >
              {/* Hover glow as a pre-rendered shadow faded via opacity
                    (compositor) instead of animating box-shadow (paint-bound). */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 shadow-[0_0_34px_rgba(34,197,94,0.2)] transition-opacity duration-300 group-hover:opacity-100"
              />
              <ProjectCard
                project={project}
                className="transition-colors duration-300 group-hover:border-[#22c55e]/50"
              />
              <HudCardFrame variant="full" />
            </div>
          ))}
        </div>
        <CoverflowControls
          onPrev={prev}
          onNext={next}
          index={activeIndex}
          count={count}
          // Sit the counter just below the card's bottom edge (cards centre at
          // the stage midpoint), so it never overlaps the card chrome.
          counterClassName=""
          counterStyle={counterStyle}
        />
      </div>

      {/* Detail overlay — the card flies here (FLIP) from the centre. Solid
            backdrop so it cleanly covers the title + carousel; padded down so it
            sits clear of the sticky nav and reads as centred. */}
      <DetailOverlay
        open={!!activeProject}
        onClose={close}
        closeLabel="Close project details"
      >
        {activeProject && (
          <>
            <DetailOverlayContent
              ref={flipRef}
              className="shrink-0"
              style={{ width: CARD_W, height: CARD_H }}
            >
              <ProjectCard project={activeProject} className="h-full w-full" />
            </DetailOverlayContent>
            <DetailOverlayContent>
              <ProjectDetail project={activeProject} open={detailOpen} />
            </DetailOverlayContent>
          </>
        )}
      </DetailOverlay>
    </section>
  );
}
