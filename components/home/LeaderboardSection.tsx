"use client";

import { useEffect, useRef, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/8bit-avatar";
import { Button } from "@/components/ui/8bit-button";
import { Card } from "@/components/ui/8bit-card";
import { useScrubProgress } from "@/hooks/useScrubProgress";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./SectionHeading";

// Plain, serializable row — mapped server-side from leaderboard_scores.
export interface LeaderboardEntry {
  rank: number; // positional display rank, 1..N
  name: string;
  /** Immutable GitHub handle — shown so a joke display name still has a real ID. */
  username: string;
  image: string | null;
  score: number; // overall / total score
  githubScore: number;
  lcScore: number;
  eventScore: number;
}

interface LeaderboardSectionProps {
  entries: LeaderboardEntry[];
}

// ─── tuning ──────────────────────────────────────────────────────────────────
// Height of the scroll region (the pinned stage is one screen; the rest is the
// scrub distance that drives the cinematic).
const SECTION_VH = 380;

// Scroll-progress windows [start, end] for each beat. Avatars spin in, then
// their pillar rises beneath them, rank by rank — then the whole podium slides
// aside (phase B) while the top-20 list arrives.
//
// Beat 1 opens at progress 0 so the cinematic starts the instant the section
// pins, instead of leaving a dead band of empty stage while the viewer waits
// for the first avatar to arrive.
const BEATS = {
  1: { avatar: [0.0, 0.12] as const, pillar: [0.1, 0.22] as const },
  2: { avatar: [0.13, 0.27] as const, pillar: [0.25, 0.37] as const },
  3: { avatar: [0.28, 0.44] as const, pillar: [0.42, 0.54] as const },
  crown: [0.12, 0.26] as const,
  phaseB: [0.62, 0.88] as const,
};

const RANK_STYLE: Record<
  number,
  { color: string; glow: string; pillarH: { base: number; wide: number } }
> = {
  1: {
    color: "#facc15",
    glow: "250,204,21",
    pillarH: { base: 210, wide: 300 },
  },
  2: {
    color: "#d4d4d8",
    glow: "212,212,216",
    pillarH: { base: 175, wide: 240 },
  },
  3: {
    color: "#cd7f32",
    glow: "205,127,50",
    pillarH: { base: 145, wide: 195 },
  },
};

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}
function seg(p: number, a: number, b: number): number {
  return clamp01((p - a) / (b - a));
}
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Hydration-safe media query: starts `true` (desktop) on both server and first
// client render, then corrects after mount so only narrow screens reflow.
function useIsWide(): boolean {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    // Side-by-side split only on genuinely wide screens; below this the podium
    // (which stays a substantial width) and the list can't sit together without
    // crowding, so narrower screens use the stacked layout instead.
    const mq = window.matchMedia("(min-width: 1280px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

// ─── Pixel crown (pure 8-bit, crisp-edged) ───────────────────────────────────
// The crown perches on the avatar's top-right at a rakish clockwise tilt (top
// leaning outward to the right), pivoting on its base so it reads as resting
// there. Positive = clockwise.
const CROWN_REST_DEG = 45;

function PixelCrown({ progress }: { progress: number }) {
  const ce = clamp01(easeOutBack(progress));
  return (
    <div
      aria-hidden="true"
      className="absolute -right-2 -top-5 z-20"
      style={{
        opacity: clamp01(progress * 1.4),
        // Eases in from a slightly deeper tilt and settles at CROWN_REST_DEG,
        // staying on one side throughout (no swing through upright).
        transform: `translateY(${(1 - ce) * -12}px) rotate(${CROWN_REST_DEG - (1 - ce) * 14}deg) scale(${0.4 + 0.6 * ce})`,
        transformOrigin: "bottom center",
        willChange: "opacity, transform",
        filter: "drop-shadow(0 0 6px rgba(250,204,21,0.6))",
      }}
    >
      <svg
        width="60"
        height="46"
        viewBox="0 0 9 7"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        {/* 3-prong crown: peaks at columns 0, 4, 8 */}
        {[
          [0, 0],
          [4, 0],
          [8, 0],
          [0, 1],
          [4, 1],
          [8, 1],
          [0, 2],
          [2, 2],
          [4, 2],
          [6, 2],
          [8, 2],
          ...Array.from({ length: 9 }, (_, x) => [x, 3] as const),
          ...Array.from({ length: 9 }, (_, x) => [x, 4] as const),
        ].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="1" height="1" fill="#facc15" />
        ))}
        {/* jewels */}
        <rect x="2" y="3" width="1" height="1" fill="#ef4444" />
        <rect x="4" y="4" width="1" height="1" fill="#22c55e" />
        <rect x="6" y="3" width="1" height="1" fill="#3b82f6" />
      </svg>
    </div>
  );
}

// ─── One podium column: avatar (spins in) atop a rising pillar ────────────────
function PodiumColumn({
  entry,
  rank,
  progress,
  wide,
}: {
  entry: LeaderboardEntry;
  rank: number;
  progress: number;
  wide: boolean;
}) {
  const beat = BEATS[rank as 1 | 2 | 3];
  const style = RANK_STYLE[rank];

  const avRaw = seg(progress, beat.avatar[0], beat.avatar[1]);
  const avE = easeOutCubic(avRaw);
  const avScale = 0.35 + 0.65 * clamp01(easeOutBack(avRaw));
  const avRotate = (1 - avE) * 360; // one full dramatic turn as it fades in

  const pRaw = seg(progress, beat.pillar[0], beat.pillar[1]);
  const pE = easeOutCubic(pRaw);

  const crownRaw =
    rank === 1 ? seg(progress, BEATS.crown[0], BEATS.crown[1]) : 0;

  const pillarH = wide ? style.pillarH.wide : style.pillarH.base;
  const avatarSize =
    rank === 1 ? (wide ? "size-40" : "size-24") : wide ? "size-32" : "size-20";

  return (
    <div className="flex w-1/3 max-w-[210px] flex-col items-center justify-end">
      {/* Avatar + crown */}
      <div
        className="relative mb-3"
        style={{
          opacity: avRaw,
          transform: `translateY(${(1 - avE) * 18}px) scale(${avScale})`,
          willChange: "opacity, transform",
        }}
      >
        <div
          style={{
            transform: `rotate(${avRotate}deg)`,
            willChange: "transform",
            // Static glow — the composited rotate/scale/opacity carry the entrance
            // "pop". Animating drop-shadow blur per frame is paint-bound and was
            // the podium's main scroll-jank source.
            filter: `drop-shadow(0 0 16px rgba(${style.glow},0.65))`,
          }}
        >
          <Avatar className={avatarSize}>
            {entry.image ? (
              <AvatarImage
                src={entry.image}
                alt={entry.name}
                className="object-cover"
              />
            ) : (
              <AvatarFallback>{initials(entry.name)}</AvatarFallback>
            )}
          </Avatar>
        </div>
        {rank === 1 && <PixelCrown progress={crownRaw} />}
      </div>

      {/* Name + immutable GitHub handle */}
      <div
        className="mb-2 flex max-w-full flex-col items-center"
        style={{ opacity: avRaw }}
        title={`${entry.name} · @${entry.username}`}
      >
        <p
          className={`retro max-w-full truncate text-center text-white ${
            wide ? "text-[17px]" : "text-[13px]"
          }`}
        >
          {entry.name}
        </p>
        <p className="retro max-w-full truncate text-center text-[9px] tracking-wider text-muted-foreground/70">
          @{entry.username}
        </p>
      </div>

      {/* Rising pillar — translateY inside an overflow-hidden box so it grows up
          from the floor without distorting the rank/score text. */}
      <div className="w-full overflow-hidden" style={{ height: pillarH }}>
        <div
          className="flex h-full w-full flex-col items-center justify-start gap-2 border-[3px] border-t-[6px] pt-5"
          style={{
            transform: `translateY(${(1 - pE) * 100}%)`,
            willChange: "transform",
            borderColor: style.color,
            background: `linear-gradient(180deg, rgba(${style.glow},0.18), rgba(${style.glow},0.04))`,
            boxShadow: `inset 0 0 18px rgba(${style.glow},0.18)`,
          }}
        >
          <span
            className={`retro ${wide ? "text-8xl" : "text-6xl"}`}
            style={{
              color: style.color,
              textShadow: `0 0 16px rgba(${style.glow},0.75)`,
              // Force a tight line box: the global `.retro` rule sets
              // line-height:1.5 in an unlayered stylesheet, which outranks
              // Tailwind's `leading-none` utility and made the huge glyph ~1.5×
              // taller than its pillar (so rank 3 overflowed the bottom).
              lineHeight: 1,
            }}
          >
            {rank}
          </span>
          <span
            className={`retro text-white/85 ${wide ? "text-2xl" : "text-lg"}`}
            style={{ lineHeight: 1.1 }}
          >
            {entry.score}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Ranked list (arrives in phase B) — paginated 10 per page ─────────────────
const PAGE_SIZE = 10;

function LeaderboardList({
  entries,
  phaseB,
}: {
  entries: LeaderboardEntry[];
  phaseB: number;
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  // Guard against the page falling out of range if the dataset shrinks.
  const safePage = Math.min(page, pageCount - 1);
  const startIndex = safePage * PAGE_SIZE;
  const pageEntries = entries.slice(startIndex, startIndex + PAGE_SIZE);
  const hasPages = entries.length > PAGE_SIZE;
  const rangeStart = startIndex + 1;
  const rangeEnd = startIndex + pageEntries.length;

  return (
    <Card className="border-white/10 py-5">
      {/* Single wrapper so the Card's flex gap doesn't open a gulf between the
          header and the rows; spacing is controlled here instead. */}
      <div className="px-4">
        <p className="retro mb-3 text-xs tracking-wider text-[#22c55e]">
          RANK {rangeStart}–{rangeEnd}
        </p>

        {/* Column headers — aligned to the row grid below (pos · avatar · name ·
            GH · LC · EVT · TOTAL). The numeric columns are fixed-width and
            right-aligned so the digits line up into clean columns. */}
        <div className="mb-1 flex items-center gap-2 border-b-2 border-white/10 px-1.5 pb-2 sm:gap-3">
          <span className="retro w-6 shrink-0 text-right text-[8px] tracking-[0.1em] text-muted-foreground/80">
            POS
          </span>
          <span className="w-7 shrink-0" aria-hidden="true" />
          <span className="retro min-w-0 flex-1 text-[8px] tracking-[0.15em] text-muted-foreground/80">
            NAME
          </span>
          <ScoreHead label="GH" title="GitHub score" />
          <ScoreHead label="LC" title="LeetCode score" />
          <ScoreHead label="EVT" title="Event participation score" />
          <span className="retro w-12 shrink-0 text-right text-[8px] tracking-[0.15em] text-[#22c55e]/90">
            TOTAL
          </span>
        </div>

        <div>
          {pageEntries.map((e, i) => {
            // Rows cascade in, offset by index, as phase B progresses.
            const rp = clamp01((phaseB * 1.35 - i * 0.04) / 0.5);
            const medal = RANK_STYLE[e.rank];
            return (
              <div
                key={`${e.rank}-${e.name}`}
                className="flex items-center gap-2 border-b border-white/5 px-1.5 py-2 last:border-b-0 sm:gap-3"
                style={{
                  opacity: rp,
                  transform: `translateX(${(1 - rp) * -24}px)`,
                  willChange: "opacity, transform",
                }}
              >
                <span
                  className="retro w-6 shrink-0 text-right text-xs"
                  style={{ color: medal ? medal.color : "#ffffff" }}
                >
                  {e.rank}
                </span>
                <Avatar className="size-7 shrink-0">
                  {e.image ? (
                    <AvatarImage
                      src={e.image}
                      alt={e.name}
                      className="object-cover"
                    />
                  ) : (
                    <AvatarFallback className="text-[9px]">
                      {initials(e.name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div
                  className="flex min-w-0 flex-1 flex-col leading-tight"
                  title={`${e.name} · @${e.username}`}
                >
                  <span className="truncate text-sm text-white/90">
                    {e.name}
                  </span>
                  <span className="retro truncate text-[8px] tracking-wider text-muted-foreground/70">
                    @{e.username}
                  </span>
                </div>
                <ScoreCell value={e.githubScore} />
                <ScoreCell value={e.lcScore} />
                <ScoreCell value={e.eventScore} />
                <span className="retro w-12 shrink-0 text-right text-sm text-[#22c55e]">
                  {e.score}
                </span>
              </div>
            );
          })}
        </div>

        {/* Pager — only when there are more than one page of members. */}
        {hasPages && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <PagerButton
              label="‹ PREV"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            />
            <span className="retro text-[9px] tracking-widest text-muted-foreground">
              PAGE {safePage + 1} / {pageCount}
            </span>
            <PagerButton
              label="NEXT ›"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

// Pixel pager control on the shared 8-bit Button (chunky border + shadow),
// matching the events grid pager. Disabled + dimmed at the ends of the range.
function PagerButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="text-[9px]"
    >
      {label}
    </Button>
  );
}

// Right-aligned, fixed-width numeric column header.
function ScoreHead({ label, title }: { label: string; title: string }) {
  return (
    <span
      title={title}
      className="retro w-9 shrink-0 text-right text-[8px] tracking-[0.12em] text-muted-foreground/80"
    >
      {label}
    </span>
  );
}

// Right-aligned per-category score value (muted mono so the green TOTAL stays
// the clear focal point of each row).
function ScoreCell({ value }: { value: number }) {
  return (
    <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-white/55">
      {value}
    </span>
  );
}

function EmptyState() {
  return (
    <section id="leaderboard" className="w-full scroll-mt-24 px-6 py-24">
      <SectionHeading text="LEADERBOARD" />
      <div className="mx-auto max-w-md">
        <Card className="items-center gap-4 border-white/10 py-12 text-center">
          <span className="retro text-3xl text-[#22c55e]/30">▟▙</span>
          <h3 className="retro text-sm text-white">LEADERBOARD COMPUTING</h3>
          <p className="retro text-[9px] text-muted-foreground">
            SCORES UPDATE EVERY 15 MINUTES · CHECK BACK SOON
          </p>
        </Card>
      </div>
    </section>
  );
}

export function LeaderboardSection({ entries }: LeaderboardSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Start the cinematic while the section is still rising into view (~halfway
  // up the viewport) rather than waiting for it to pin, so there's no empty
  // pinned beat — the podium is already animating in as it arrives.
  const progress = useScrubProgress(sectionRef, { lead: 0.5 });
  const wide = useIsWide();
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setContainerWidth(e.contentRect.width),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (entries.length === 0) return <EmptyState />;

  const byRank: Record<number, LeaderboardEntry | undefined> = {
    1: entries[0],
    2: entries[1],
    3: entries[2],
  };
  // Classic podium ordering: 2nd · 1st · 3rd, left → right.
  const visualOrder = [2, 1, 3].filter((r) => byRank[r]) as number[];

  const phaseB = seg(progress, BEATS.phaseB[0], BEATS.phaseB[1]);
  const phaseBE = easeOutCubic(phaseB);

  // Phase B: the podium slides aside and the ranked list arrives. On narrow
  // screens the podium rises and the list drops in beneath it; on wide screens
  // the two sit side-by-side.
  //
  // The wide layout treats list + podium as ONE unit and centres that unit in
  // the container (the list used to be pinned to the left edge, which left the
  // whole composition visually left-heavy with dead space on the right). Both
  // grow on wider screens via `grow`, and the group is sized so a positive
  // margin remains even at the 1280px wide breakpoint — so it never overflows.
  //
  // Derivation (cw = container width, all widths in px):
  //   listW       = list panel width
  //   podiumBoxW  = scaled podium box (max-w-3xl × scale), centred on its content
  //   groupShift  = (gap + listW) / 2      → podium box centre = cw/2 + groupShift
  //   groupOffset = cw/2 − groupShift − podiumBoxW/2   (equal left & right margin)
  // These make the list→podium gap exactly `GROUP_GAP` and the unit centred.
  const grow = clamp01((containerWidth - 1232) / (1536 - 1232));
  const lerp = (a: number, b: number) => a + (b - a) * grow;
  const PODIUM_BOX = 768; // max-w-3xl — the podium's width before scaling
  const GROUP_GAP = 64; // px between the list's right edge and the podium box
  // Only the wide (grow→1) end grows: at the 1280px breakpoint (grow 0) the
  // group already nearly fills the container, so its sizes must stay put or it
  // would overflow. The larger ends are tuned to keep a positive margin at the
  // 1536px cap.
  const podiumScaleEnd = lerp(0.7, 0.8);
  const listW = lerp(0.46, 0.5) * containerWidth + lerp(30, 42);
  const podiumBoxW = PODIUM_BOX * podiumScaleEnd;
  const groupShift = (GROUP_GAP + listW) / 2;
  const groupOffset = containerWidth / 2 - groupShift - podiumBoxW / 2;
  // The pinned stage reserves a title row up top (pt-28), so content centred in
  // the area below it lands below the viewport's true middle. Lift the whole
  // composition by half that title band so it reads as vertically centred.
  const RAISE = 80;

  const podiumTransform = wide
    ? `translate(calc(-50% + ${phaseBE * groupShift}px), calc(-50% - ${RAISE}px)) scale(${1 - phaseBE * (1 - podiumScaleEnd)})`
    : `translate(-50%, calc(-50% - ${phaseBE * 150}px)) scale(${1 - phaseBE * 0.28})`;

  const listWrapperClass = wide
    ? "absolute left-0 top-1/2"
    : "absolute bottom-[4%] left-1/2 w-[92%] max-w-md";
  // Computed px (not a calc string) so it stays in lock-step with the centring
  // math above, which also reads containerWidth.
  const listWidth = wide ? `${listW}px` : undefined;
  const listTransform = wide
    ? `translateY(calc(-50% - ${RAISE}px)) translateX(${groupOffset - (1 - phaseB) * 30}px)`
    : `translateX(-50%) translateY(${(1 - phaseB) * 36}px)`;

  return (
    <section
      ref={sectionRef}
      id="leaderboard"
      className="relative w-full scroll-mt-24"
      style={{ height: `${SECTION_VH}vh` }}
    >
      <div className="sticky top-0 flex h-screen w-full flex-col overflow-hidden px-6">
        {/* Title gets its own row at the top so the podium never covers it. */}
        <div className="shrink-0 pt-28">
          <SectionHeading text="LEADERBOARD" />
        </div>

        {/* Podium + list centre within the area below the title. */}
        <div
          ref={containerRef}
          className="relative mx-auto w-full max-w-[96rem] flex-1"
        >
          {/* Podium */}
          <div
            className="absolute left-1/2 top-1/2 flex w-full max-w-3xl items-end justify-center gap-4 sm:gap-8"
            style={{
              transform: podiumTransform,
              willChange: "transform",
            }}
          >
            {visualOrder.map((rank) => (
              <PodiumColumn
                key={rank}
                rank={rank}
                entry={byRank[rank]!}
                progress={progress}
                wide={wide}
              />
            ))}
          </div>

          {/* Top-20 list */}
          <div
            className={cn(listWrapperClass)}
            style={{
              width: listWidth,
              transform: listTransform,
              opacity: phaseB,
              pointerEvents: phaseB > 0.5 ? "auto" : "none",
              willChange: "transform, opacity",
            }}
          >
            <LeaderboardList entries={entries} phaseB={phaseB} />
          </div>
        </div>
      </div>
    </section>
  );
}
