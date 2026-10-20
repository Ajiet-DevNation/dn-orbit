"use client";

import { memo, useRef, useState } from "react";
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

// Read-only tech chip: dark background + purple pixel border + purple tech icon,
// matching the chips in the "new project" form (TechStackSelect) where the icons
// pop against the dark fill.
const TechChip = memo(function TechChip({ name }: { name: string }) {
  const Icon = TECH_BY_NAME[name]?.Icon;
  return (
    <span className="retro inline-flex items-center gap-2 border-2 border-brand bg-[#0a0a0a] px-2.5 py-1.5 text-[9px] text-white">
      {Icon && <Icon className="size-3.5 shrink-0 text-brand-light" />}
      {name}
    </span>
  );
});

import { useViewportSize } from "@/hooks/useViewportSize";
import { lensSize } from "@/lib/lens-layout";
import { CoverflowControls } from "./CoverflowControls";
import { LENS_COUNTER_STYLE, LensSection } from "./LensSection";

// ─── tuning (desktop reference; scaled to the viewport by lensSize) ──────────
const DETAIL_MAX_W = 560; // card width inside the detail overlay
const LENS_SIZING = {
  maxWidth: 900, // centre-card (lens) width cap
  ratio: 600 / 680, // height / width
  share: 0.46, // lens width / viewport on wider screens
  phoneShare: 0.8,
  thumbRatio: 0.36, // thumb height / lens height (oryzo ~0.35)
};

function statusColor(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "#8b5cf6";
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
      return "bg-brand";
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
        "h-full justify-start gap-0 overflow-hidden border-white/10 py-0 shadow-[0_0_15px_rgba(139,92,246,0.04)]",
        className,
      )}
      style={style}
    >
      {/* Sizes are in container units (cqw) of the card's wrapper, which is a
          size container, so the chrome scales with the lens instead of
          sitting tiny in a big card. */}
      <div className="flex items-center justify-between gap-3 border-b-[6px] border-white/10 px-[clamp(1.25rem,3cqw,2rem)] py-[clamp(1rem,2.4cqw,1.5rem)]">
        <h3 className="retro truncate text-[clamp(0.875rem,2.2cqw,1.25rem)] text-white">
          {project.title}
        </h3>
        <span
          className="retro shrink-0 border-2 px-[clamp(0.5rem,1.2cqw,0.75rem)] py-[clamp(0.25rem,0.7cqw,0.4rem)] text-[clamp(7px,1.1cqw,10px)]"
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
            <div className="dot-grid-bg relative flex h-full w-full flex-col items-center justify-center gap-[clamp(1.75rem,4cqw,2.75rem)] p-8">
              {/* Oversized monogram watermark for depth behind the tile. */}
              <span
                aria-hidden
                className="retro pointer-events-none absolute inset-0 flex items-center justify-center text-[clamp(12rem,34cqw,20rem)] leading-none text-white/[0.03] select-none"
              >
                {monogram}
              </span>

              {/* Cartridge tile: status-colored pixel border + monogram. */}
              <div
                className="relative z-10 flex size-[clamp(7rem,17cqw,10.5rem)] items-center justify-center border-4 bg-[#0a0a0a]"
                style={{ borderColor: color, boxShadow: `0 0 24px ${color}22` }}
              >
                <span className="retro text-[clamp(2.25rem,6cqw,3.75rem)] text-white select-none">
                  {monogram}
                </span>
              </div>

              {/* Tech stack chips — the glanceable substance that fills the card. */}
              {project.techStack.length > 0 && (
                <div className="z-10 flex max-w-[85%] flex-wrap justify-center gap-[clamp(0.75rem,1.6cqw,1rem)] [&>span]:px-[clamp(0.625rem,1.4cqw,0.9rem)] [&>span]:py-[clamp(0.375rem,0.9cqw,0.6rem)] [&>span]:text-[clamp(9px,1.4cqw,12px)]">
                  {project.techStack.map((tech) => (
                    <TechChip key={tech} name={tech} />
                  ))}
                </div>
              )}

              <FaGithub className="z-10 size-[clamp(1.25rem,3cqw,1.75rem)] text-white/20" />
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
              className="h-full"
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
        // Arrive gently, leave fast: closing is the system getting out of the way.
        transition: open
          ? "opacity 400ms var(--ease-out-quart), transform 400ms var(--ease-out-quart)"
          : "opacity 200ms var(--ease-out-quart), transform 200ms var(--ease-out-quart)",
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
            <span className="retro text-[10px] tracking-wider text-brand-light">
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
        <span className="retro text-[10px] tracking-wider text-brand-light">
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
      className="group @container relative h-full w-full cursor-pointer overflow-hidden border-2 border-white/10 bg-[#0d0d0d] transition-colors duration-200 hover:border-brand/60"
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
            className="flex size-[clamp(3.5rem,22cqw,5rem)] items-center justify-center border-[3px] bg-[#0a0a0a]"
            style={{ borderColor: color }}
          >
            <span className="retro text-[clamp(1.125rem,8cqw,1.6rem)] text-white/80 select-none">
              {monogramOf(project.title)}
            </span>
          </div>
        </div>
      )}
      <span className="retro absolute inset-x-0 bottom-0 truncate border-t-2 border-white/10 bg-[#0a0a0a]/85 px-2 py-[clamp(0.375rem,3cqw,0.6rem)] text-center text-[clamp(7px,4cqw,10px)] text-white/75">
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

  // Responsive sizing: the lens must fit one pinned screen, wide or tall.
  const viewport = useViewportSize();
  const {
    cardW: CARD_W,
    cardH: CARD_H,
    thumbW: THUMB_W,
    thumbH: THUMB_H,
  } = lensSize(viewport.width, viewport.height, LENS_SIZING);

  // The detail view leaves room for its text column: the card there is capped
  // well below the (now viewport-sized) lens. The FLIP scales between the two.
  const DETAIL_W = Math.min(CARD_W, DETAIL_MAX_W);
  const DETAIL_H = Math.round(DETAIL_W * LENS_SIZING.ratio);

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
    setIntro,
    setFocus,
    navigateRef,
  } = useCoverflow({
    count: projects.length,
    lensWidth: CARD_W,
    thumbWidth: THUMB_W,
    disabled: selected !== null,
    onActivateCenter: open,
  });

  // GSAP power-on (bracket pop) on the card the row came to rest on — keyed off
  // the SETTLED index, not the live one, so a drag sweeping past ten cards
  // doesn't fire ten bracket animations mid-gesture.
  useCardPowerOn(lensRef, settledIndex);

  const activeProject = selected !== null ? projects[selected] : null;

  // Detail overlay — the card flies here (FLIP) from the lens. Solid backdrop
  // so it cleanly covers the title + carousel; padded down so it sits clear of
  // the sticky nav and reads as centred.
  const overlay = (
    <DetailOverlay
      open={!!activeProject}
      onClose={close}
      closeLabel="Close project details"
    >
      {activeProject && (
        <>
          <DetailOverlayContent
            ref={flipRef}
            className="@container shrink-0"
            style={{ width: DETAIL_W, height: DETAIL_H }}
          >
            <ProjectCard project={activeProject} className="h-full w-full" />
          </DetailOverlayContent>
          <DetailOverlayContent>
            <ProjectDetail project={activeProject} open={detailOpen} />
          </DetailOverlayContent>
        </>
      )}
    </DetailOverlay>
  );

  if (projects.length === 0) {
    return (
      <section
        ref={sectionRef}
        id="projects"
        className="relative flex min-h-screen w-full flex-col py-20 scroll-mt-24"
      >
        <div className="shrink-0 pt-28">
          <SectionHeading text="PROJECTS" />
        </div>
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="retro text-center text-[10px] tracking-widest text-muted-foreground">
            NO PROJECTS SHOWCASED YET
          </p>
        </div>
      </section>
    );
  }

  return (
    <LensSection
      id="projects"
      title="PROJECTS"
      kicker="WHAT WE BUILD"
      sectionRef={sectionRef}
      lensRef={lensRef}
      lensWidth={CARD_W}
      lensHeight={CARD_H}
      count={count}
      setIntro={setIntro}
      setFocus={setFocus}
      navigateRef={navigateRef}
      stageClassName={cn(selected !== null && "pointer-events-none opacity-0")}
      stageStyle={{ transition: "opacity 300ms var(--ease-out-quart)" }}
      thumbs={projects.map((project, i) => (
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
          <ProjectThumb project={project} index={i} onPick={onCardClick} />
        </div>
      ))}
      cards={projects.map((project, i) => (
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
          className="group @container absolute inset-0 cursor-pointer"
          style={{ visibility: i === 0 ? undefined : "hidden" }}
        >
          <ProjectCard
            project={project}
            className="transition-colors duration-200 group-hover:border-brand/50"
          />
          <HudCardFrame variant="full" />
        </div>
      ))}
      controls={
        <CoverflowControls
          onPrev={prev}
          onNext={next}
          index={activeIndex}
          count={count}
          // Sit the counter just below the lens's bottom edge, so it never
          // overlaps the card chrome.
          counterClassName=""
          counterStyle={LENS_COUNTER_STYLE}
        />
      }
    >
      {overlay}
    </LensSection>
  );
}
