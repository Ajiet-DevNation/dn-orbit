"use client";

import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FaGithub, FaExternalLinkAlt } from "react-icons/fa";
import { Card } from "@/components/ui/8bit-card";
import { Button } from "@/components/ui/8bit-button";
import { cn } from "@/lib/utils";
import { type ProjectData } from "@/constants/projects";
import { TECH_BY_NAME } from "./techStack";
import { SectionHeading } from "./SectionHeading";
import { useCoverflow } from "./useCoverflow";
import { OverlayCloseButton } from "@/components/ui/OverlayCloseButton";

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
import { useScrollParallax } from "./useScrollParallax";
import { useViewportWidth } from "./useViewportWidth";

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
    project.title.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "?";
  return (
    <Card
      className={cn(
        "h-full justify-start gap-0 overflow-hidden border-white/10 py-0 shadow-[0_0_15px_rgba(34,197,94,0.04)]",
        className
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.imageUrl}
            alt={project.title}
            loading="lazy"
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
      {/* min-w-0 + break-words lets a long title wrap cleanly. */}
      <div className="flex items-center gap-3">
        <span
          className="retro shrink-0 border-2 px-2 py-1 text-[8px]"
          style={{ color, borderColor: color }}
        >
          {project.status}
        </span>
        <h3 className="retro min-w-0 break-words text-2xl text-white">
          {project.title}
        </h3>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {project.description}
      </p>

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
              <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                <FaGithub className="size-4" />
                VIEW ON GITHUB
              </a>
            </Button>
          )}
          {project.demoUrl && (
            <Button asChild size="sm" className="text-[9px]">
              <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
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
  const [selected, setSelected] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Responsive sizing: cap at the desktop width, otherwise scale to the viewport
  // so the centre card always fits a phone screen.
  const vw = useViewportWidth();
  const CARD_W = Math.min(MAX_CARD_W, Math.round(vw * 0.86));
  const CARD_H = Math.round(CARD_W * CARD_RATIO);
  const SPREAD = Math.round(CARD_W * SPREAD_RATIO);
  const DRIFT = vw < 768 ? Math.round(vw * 0.15) : 260;

  // Rect of the centre card at the moment it was opened, so the *same* card can
  // fly from there into the detail view (a FLIP shared-element transition).
  const clickedRectRef = useRef<DOMRect | null>(null);
  const flipRef = useRef<HTMLDivElement>(null);

  const open = (index: number, el: HTMLElement) => {
    clickedRectRef.current = el.getBoundingClientRect();
    setSelected(index);
  };

  const { sectionRef, registerCard, onCardClick, stageHandlers } = useCoverflow({
    count: projects.length,
    spread: SPREAD,
    disabled: selected !== null,
    onActivateCenter: open,
  });

  const stageRef = useRef<HTMLDivElement>(null);
  // Projects drift LEFT as you scroll down (Members mirror it, drifting right).
  useScrollParallax(sectionRef, stageRef, { maxPx: DRIFT, direction: -1, tau: 90 });

  // FLIP: place the detail card over the clicked card, then play it to its slot.
  useLayoutEffect(() => {
    const el = flipRef.current;
    const from = clickedRectRef.current;
    if (selected === null || !el || !from) return;
    const to = el.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    const sx = to.width ? from.width / to.width : 1;
    const sy = to.height ? from.height / to.height : 1;
    el.style.transition = "none";
    el.style.transformOrigin = "top left";
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    void el.offsetWidth;
    requestAnimationFrame(() => {
      el.style.transition = "transform 480ms var(--ease-out-quart)";
      el.style.transform = "translate(0px, 0px) scale(1, 1)";
      setDetailOpen(true);
    });
  }, [selected]);

  const close = () => {
    const el = flipRef.current;
    const from = clickedRectRef.current;
    setDetailOpen(false);
    if (!el || !from) {
      setSelected(null);
      return;
    }
    const to = el.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    const sx = to.width ? from.width / to.width : 1;
    const sy = to.height ? from.height / to.height : 1;
    el.style.transition = "transform 420ms var(--ease-out-quart)";
    el.style.transformOrigin = "top left";
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    const done = () => {
      el.removeEventListener("transitionend", done);
      setSelected(null);
    };
    el.addEventListener("transitionend", done);
  };

  // Keep a ref to the latest close() so the Escape listener depends only on
  // `selected` (close is a fresh closure each render under React Compiler).
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (selected === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

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

      {/* Coverflow stage */}
      <div
        ref={stageRef}
        className={cn(
          "relative w-full flex-1 cursor-grab touch-pan-y select-none active:cursor-grabbing",
          selected !== null && "pointer-events-none opacity-0"
        )}
        style={{ transition: "opacity 300ms var(--ease-out-quart)" }}
        {...stageHandlers}
      >
          {projects.map((project, i) => (
            <div
              key={project.id}
              ref={registerCard(i)}
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
            </div>
          ))}
        </div>

        {/* Detail overlay — the card flies here (FLIP) from the centre. Solid
            backdrop so it cleanly covers the title + carousel; padded down so it
            sits clear of the sticky nav and reads as centred. */}
        {activeProject && (
          <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#0a0a0a]">
            {/* Full-screen modal (above the sticky header), matching the events
                overlay — one consistent, always-reachable close button. */}
            <div className="relative mx-auto flex min-h-full w-full max-w-6xl flex-col items-center justify-center gap-8 px-6 py-24 lg:flex-row lg:gap-16">
              <OverlayCloseButton
                onClick={close}
                label="Close project details"
                className="fixed right-4 top-4 z-[70]"
              />

              <div
                ref={flipRef}
                className="shrink-0"
                style={{ width: CARD_W, height: CARD_H }}
              >
                <ProjectCard project={activeProject} className="h-full w-full" />
              </div>

              <ProjectDetail project={activeProject} open={detailOpen} />
            </div>
          </div>
        )}
    </section>
  );
}
