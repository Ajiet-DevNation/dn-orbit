"use client";

import { useEffect, useRef, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/8bit-avatar";
import { Card } from "@/components/ui/8bit-card";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./SectionHeading";
import { useScrubProgress } from "./useScrubProgress";

// Plain, serializable row — mapped server-side from leaderboard_scores.
export interface LeaderboardEntry {
  rank: number; // positional display rank, 1..N
  name: string;
  image: string | null;
  score: number;
}

interface LeaderboardSectionProps {
  entries: LeaderboardEntry[];
}

// ─── tuning ──────────────────────────────────────────────────────────────────
// Height of the scroll region (the pinned stage is one screen; the rest is the
// scrub distance that drives the cinematic).
const SECTION_VH = 460;

// Scroll-progress windows [start, end] for each beat. Avatars spin in, then
// their pillar rises beneath them, rank by rank — then the whole podium slides
// aside (phase B) while the top-20 list arrives.
const BEATS = {
  1: { avatar: [0.05, 0.2] as const, pillar: [0.16, 0.28] as const },
  2: { avatar: [0.26, 0.4] as const, pillar: [0.36, 0.47] as const },
  3: { avatar: [0.45, 0.59] as const, pillar: [0.55, 0.66] as const },
  crown: [0.18, 0.31] as const,
  phaseB: [0.7, 0.92] as const,
};

const RANK_STYLE: Record<
  number,
  { color: string; glow: string; pillarH: { base: number; wide: number } }
> = {
  1: { color: "#facc15", glow: "250,204,21", pillarH: { base: 180, wide: 300 } },
  2: { color: "#d4d4d8", glow: "212,212,216", pillarH: { base: 140, wide: 230 } },
  3: { color: "#cd7f32", glow: "205,127,50", pillarH: { base: 110, wide: 175 } },
};

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}
function seg(p: number, a: number, b: number): number {
  return clamp01((p - a) / (b - a));
}
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
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
const CROWN_REST_DEG = 20;

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
      <svg width="60" height="46" viewBox="0 0 9 7" shapeRendering="crispEdges">
        {/* 3-prong crown: peaks at columns 0, 4, 8 */}
        {[
          [0, 0], [4, 0], [8, 0],
          [0, 1], [4, 1], [8, 1],
          [0, 2], [2, 2], [4, 2], [6, 2], [8, 2],
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
    rank === 1
      ? wide ? "size-40" : "size-24"
      : wide ? "size-32" : "size-20";

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
            filter: `drop-shadow(0 0 ${6 + avE * 10}px rgba(${style.glow},${0.25 + avE * 0.4}))`,
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

      {/* Name */}
      <p
        className="retro mb-2 max-w-full truncate text-center text-[11px] text-white"
        style={{ opacity: avRaw }}
        title={entry.name}
      >
        {entry.name}
      </p>

      {/* Rising pillar — translateY inside an overflow-hidden box so it grows up
          from the floor without distorting the rank/score text. */}
      <div className="w-full overflow-hidden" style={{ height: pillarH }}>
        <div
          className="flex h-full w-full flex-col items-center justify-start gap-1 border-[3px] border-t-[6px] pt-3"
          style={{
            transform: `translateY(${(1 - pE) * 100}%)`,
            willChange: "transform",
            borderColor: style.color,
            background: `linear-gradient(180deg, rgba(${style.glow},0.18), rgba(${style.glow},0.04))`,
            boxShadow: `inset 0 0 18px rgba(${style.glow},0.18)`,
          }}
        >
          <span
            className="retro text-4xl leading-none"
            style={{
              color: style.color,
              textShadow: `0 0 12px rgba(${style.glow},0.7)`,
            }}
          >
            {rank}
          </span>
          <span className="retro text-[10px] text-white/70">{entry.score}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Top-20 list (arrives in phase B) ─────────────────────────────────────────
function LeaderboardList({
  entries,
  phaseB,
}: {
  entries: LeaderboardEntry[];
  phaseB: number;
}) {
  return (
    <Card className="border-white/10 py-7">
      <p className="retro mb-4 px-7 text-sm tracking-wider text-[#22c55e]">
        TOP {entries.length}
      </p>
      <div className="no-scrollbar max-h-[72vh] overflow-y-auto px-3">
        {entries.map((e, i) => {
          // Rows cascade in, offset by index, as phase B progresses.
          const rp = clamp01((phaseB * 1.35 - i * 0.04) / 0.5);
          const medal = RANK_STYLE[e.rank];
          return (
            <div
              key={`${e.rank}-${e.name}`}
              className="flex items-center gap-4 border-b border-white/5 px-4 py-3 last:border-b-0"
              style={{
                opacity: rp,
                transform: `translateX(${(1 - rp) * -24}px)`,
                willChange: "opacity, transform",
              }}
            >
              <span
                className="retro w-8 shrink-0 text-right text-base"
                style={{ color: medal ? medal.color : "#ffffff" }}
              >
                {e.rank}
              </span>
              <Avatar className="size-11 shrink-0">
                {e.image ? (
                  <AvatarImage
                    src={e.image}
                    alt={e.name}
                    className="object-cover"
                  />
                ) : (
                  <AvatarFallback className="text-xs">
                    {initials(e.name)}
                  </AvatarFallback>
                )}
              </Avatar>
              <span
                className="flex-1 truncate text-lg text-white/90"
                title={e.name}
              >
                {e.name}
              </span>
              <span className="retro shrink-0 text-base text-[#22c55e]">
                {e.score}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
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
            SCORES UPDATE NIGHTLY — CHECK BACK SOON
          </p>
        </Card>
      </div>
    </section>
  );
}

export function LeaderboardSection({ entries }: LeaderboardSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progress = useScrubProgress(sectionRef);
  const wide = useIsWide();
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setContainerWidth(e.contentRect.width));
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

  // Phase B: slide the podium aside and bring the list in. On wide screens the
  // podium moves right and the list fills the left; on narrow screens the podium
  // rises and the list drops in beneath it.
  const podiumTransform = wide
    ? `translate(calc(-50% + ${phaseBE * containerWidth * 0.18}px), -50%) scale(${1 - phaseBE * 0.28})`
    : `translate(-50%, calc(-50% - ${phaseBE * 150}px)) scale(${1 - phaseBE * 0.28})`;

  const listWrapperClass = wide
    ? "absolute left-0 top-1/2 w-[46%]"
    : "absolute bottom-[4%] left-1/2 w-[92%] max-w-md";
  const listTransform = wide
    ? `translateY(-50%) translateX(${(1 - phaseB) * -30}px)`
    : `translateX(-50%) translateY(${(1 - phaseB) * 36}px)`;

  return (
    <section
      ref={sectionRef}
      id="leaderboard"
      className="relative w-full scroll-mt-24"
      style={{ height: `${SECTION_VH}vh` }}
    >
      <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden px-6">
        <div className="absolute inset-x-0 top-10 z-10">
          <SectionHeading text="LEADERBOARD" />
        </div>

        <div
          ref={containerRef}
          className="relative mx-auto h-full w-full max-w-[96rem]"
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
