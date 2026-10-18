"use client";

import { memo, useMemo, useRef, useState } from "react";
import { FaExternalLinkAlt, FaGithub } from "react-icons/fa";
import { Button } from "@/components/ui/8bit-button";
import { Card } from "@/components/ui/8bit-card";
import { Progress } from "@/components/ui/8bit-progress";
import {
  DetailOverlay,
  DetailOverlayContent,
} from "@/components/ui/DetailOverlay";
import { useCardPowerOn } from "@/hooks/useCardPowerOn";
import { useCoverflow } from "@/hooks/useCoverflow";
import { useFlipDetail } from "@/hooks/useFlipDetail";
import type { ProjectData } from "@/lib/projects";
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
const MAX_CARD_W = 680; // centre-card (lens) width (px) on desktop
const CARD_RATIO = 600 / 680; // height / width
const THUMB_RATIO = 0.4; // thumb height / lens height
const LENS_PAD = 6; // dashed lens frame inset around the card (px)
const LENS_BREAKPOINT = 768; // below this, phone sizing

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

// Up to two alphanumerics for the cartridge monogram, e.g. "CERT GEN" → "CE".
function monogramOf(title: string): string {
  return (
    title
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
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
  // Remembers WHICH src failed, by URL rather than a boolean, so a later fix
  // (admin pastes a working URL) retries on its own. A dead cover — a deleted
  // legacy upload, or a repo GitHub has no preview for — degrades to the
  // cartridge placeholder instead of the browser's broken-image glyph.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const cover =
    project.imageUrl && project.imageUrl !== failedSrc
      ? project.imageUrl
      : null;
  const monogram = monogramOf(project.title);
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
        {/* The lens carousel tilts + zooms this wrapper as the card slides
            through (see useCoverflow); the header and progress strip stay put. */}
        <div data-lens-tilt className="h-full w-full">
          {cover ? (
            // biome-ignore lint/performance/noImgElement: arbitrary remote host — next/image would need per-host config
            <img
              src={cover}
              alt={project.title}
              loading="lazy"
              // See MembersSection: intrinsic size stops the card reflowing when
              // the bytes land, async decode keeps it off the main thread.
              width={680}
              height={600}
              decoding="async"
              draggable={false}
              onError={() => setFailedSrc(cover)}
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
        </div>

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

// ─── Thumb (the small strip either side of the lens) ──────────────────────────
// Decorative twin of the card: the big card in the lens is the real control, so
// thumbs stay out of the tab order and the accessibility tree.
const ProjectThumb = memo(function ProjectThumb({
  project,
  index,
  onPick,
}: {
  project: ProjectData;
  index: number;
  onPick: (index: number) => void;
}) {
  const color = statusColor(project.status);
  // Same dead-cover fallback as the full card.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const cover =
    project.imageUrl && project.imageUrl !== failedSrc
      ? project.imageUrl
      : null;
  return (
    <div
      aria-hidden
      onClick={() => onPick(index)}
      className="group relative h-full w-full cursor-pointer overflow-hidden border-2 border-white/10 bg-[#0d0d0d] transition-colors duration-200 hover:border-[#22c55e]/60"
    >
      {cover ? (
        // biome-ignore lint/performance/noImgElement: arbitrary remote host — next/image would need per-host config
        <img
          src={cover}
          alt=""
          loading="lazy"
          width={272}
          height={240}
          decoding="async"
          draggable={false}
          onError={() => setFailedSrc(cover)}
          className="pixelated h-full w-full object-cover opacity-80 transition-opacity duration-200 select-none group-hover:opacity-100 [-webkit-user-drag:none]"
        />
      ) : (
        <div className="dot-grid-bg flex h-full w-full items-center justify-center pb-6">
          <div
            className="flex size-14 items-center justify-center border-[3px] bg-[#0a0a0a]"
            style={{ borderColor: color }}
          >
            <span className="retro text-lg text-white/80 select-none">
              {monogramOf(project.title)}
            </span>
          </div>
        </div>
      )}
      <span className="retro absolute inset-x-0 bottom-0 truncate border-t-2 border-white/10 bg-[#0a0a0a]/85 px-2 py-1.5 text-center text-[7px] text-white/75">
        {project.title}
      </span>
    </div>
  );
});

export function ProjectsSection({ projects }: { projects: ProjectData[] }) {
  // FLIP shared-element transition: the centre card flies from its on-screen
  // rect into the detail slot. Keyed by carousel index.
  const { selected, detailOpen, flipRef, open, close } =
    useFlipDetail<number>();

  // Responsive sizing: cap at the desktop width, otherwise scale to the viewport
  // so the lens always fits a phone screen with thumbs peeking out.
  const vw = useViewportWidth();
  // Phones: the lens takes most of the width. Wider screens: a smaller share,
  // so the thumb strips have room to read as a strip.
  const CARD_W = Math.min(
    MAX_CARD_W,
    Math.round(vw * (vw < LENS_BREAKPOINT ? 0.8 : 0.46)),
  );
  const CARD_H = Math.round(CARD_W * CARD_RATIO);
  const THUMB_H = Math.round(CARD_H * THUMB_RATIO);
  const THUMB_W = Math.round(THUMB_H / CARD_RATIO);

  // Memoised: a fresh object literal here would give CoverflowControls a new
  // prop identity on every parent render, defeating its own memo() exactly when
  // renders are most expensive — mid-drag.
  const counterStyle = useMemo(
    () => ({
      top: `calc(50% + ${Math.round(CARD_H / 2) + LENS_PAD + 24}px)`,
      bottom: "auto" as const,
    }),
    [CARD_H],
  );

  // The lens's clipped window; the bracket power-on looks for cards in here.
  const lensRef = useRef<HTMLDivElement>(null);

  const {
    sectionRef,
    registerCard,
    registerThumb,
    onCardClick,
    next,
    prev,
    activeIndex,
    settledIndex,
    count,
    stageHandlers,
  } = useCoverflow({
    count: projects.length,
    lensWidth: CARD_W,
    thumbWidth: THUMB_W,
    autoAdvanceMs: 5200,
    disabled: selected !== null,
    onActivateCenter: open,
  });

  // GSAP power-on (bracket pop) on the card the row came to rest on — keyed off
  // the SETTLED index, not the live one, so a drag sweeping past ten cards
  // doesn't fire ten bracket animations mid-gesture.
  useCardPowerOn(lensRef, settledIndex);

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

      {projects.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="retro text-center text-[10px] tracking-widest text-muted-foreground">
            NO PROJECTS SHOWCASED YET
          </p>
        </div>
      ) : (
        // Lens stage: thumbs run out to both sides, the lens sits on top of
        // them in the middle (its solid fill is what hides a thumb sliding in).
        <div
          className={cn(
            "relative w-full flex-1 cursor-grab touch-pan-y select-none active:cursor-grabbing",
            selected !== null && "pointer-events-none opacity-0",
          )}
          style={{ transition: "opacity 300ms var(--ease-out-quart)" }}
          {...stageHandlers}
        >
          <CoverflowFloor />
          <div className="absolute inset-0">
            {projects.map((project, i) => (
              <div
                key={project.id}
                ref={registerThumb(i)}
                className="absolute left-1/2 top-1/2"
                style={{
                  width: THUMB_W,
                  height: THUMB_H,
                  marginLeft: -THUMB_W / 2,
                  marginTop: -THUMB_H / 2,
                  visibility: "hidden",
                }}
              >
                <ProjectThumb
                  project={project}
                  index={i}
                  onPick={onCardClick}
                />
              </div>
            ))}
          </div>

          <div
            className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-[#22c55e]/40 bg-[#0a0a0a] shadow-[0_0_40px_rgba(0,0,0,0.6)]"
            style={{ padding: LENS_PAD - 2 }}
          >
            <div
              ref={lensRef}
              className="relative overflow-hidden"
              style={{ width: CARD_W, height: CARD_H }}
            >
              {projects.map((project, i) => (
                <div
                  key={project.id}
                  ref={registerCard(i)}
                  data-cf-index={i}
                  role="button"
                  tabIndex={0}
                  aria-label={`${project.title} — open details`}
                  onClick={() => onCardClick(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onCardClick(i);
                    }
                  }}
                  className="group absolute inset-0 cursor-pointer"
                  style={{ visibility: i === 0 ? undefined : "hidden" }}
                >
                  <ProjectCard
                    project={project}
                    className="transition-colors duration-300 group-hover:border-[#22c55e]/50"
                  />
                  <HudCardFrame variant="full" />
                </div>
              ))}
            </div>
          </div>
          <CoverflowControls
            onPrev={prev}
            onNext={next}
            index={activeIndex}
            count={count}
            // Sit the counter just below the lens's bottom edge, so it never
            // overlaps the card chrome.
            counterClassName=""
            counterStyle={counterStyle}
          />
        </div>
      )}

      {/* Detail overlay — the card flies here (FLIP) from the lens. Solid
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
