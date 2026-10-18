"use client";

import { memo, useMemo, useRef, useState } from "react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { SiLeetcode } from "react-icons/si";
import { Card } from "@/components/ui/8bit-card";
import { MEMBERS, type MemberData } from "@/constants/members";
import { useCardPowerOn } from "@/hooks/useCardPowerOn";
import { useCoverflow } from "@/hooks/useCoverflow";
import { useViewportWidth } from "@/hooks/useViewportWidth";
import { toTitleCase } from "@/lib/names";
import { CoverflowControls, CoverflowFloor } from "./CoverflowControls";
import { HudCardFrame } from "./HudCardFrame";
import { SectionHeading } from "./SectionHeading";

// ─── tuning (desktop reference; scaled to the viewport in the component) ───────
const MAX_CARD_W = 420; // portrait member card (lens) width (px) on desktop
const CARD_RATIO = 536 / 392; // height / width (~5:7)
const THUMB_RATIO = 0.42; // thumb height / lens height
const LENS_PAD = 6; // dashed lens frame inset around the card (px)
const LENS_BREAKPOINT = 768; // below this, phone sizing
// Flip easing: smooth ease-in-out, no overshoot, so it reads as a real card turn.
const FLIP_EASE = "transform 560ms cubic-bezier(0.4, 0.0, 0.2, 1)";

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ─── Card faces ───────────────────────────────────────────────────────────────
const MemberFront = memo(function MemberFront({
  member,
}: {
  member: MemberData;
}) {
  return (
    <Card className="h-full justify-between gap-0 overflow-hidden border-white/10 py-0 shadow-[0_0_15px_rgba(34,197,94,0.05)]">
      <div className="border-b-[6px] border-white/10 px-3 py-3 text-center">
        <span className="retro text-[9px] tracking-wider text-[#22c55e]">
          {member.role}
        </span>
      </div>

      {/* Picture — ~70% of the card. Plain <img> (pixelated) or pixel placeholder. */}
      <div className="relative flex-1 overflow-hidden bg-[#0d0d0d]">
        {member.isAlumni && (
          <span className="retro absolute right-2 top-2 z-10 border-2 border-amber-400 bg-[#0a0a0a]/80 px-2 py-1 text-[7px] tracking-widest text-amber-400">
            ALUMNI
          </span>
        )}
        {/* The lens carousel tilts + zooms this wrapper as the card slides
            through (see useCoverflow); the frame around it stays straight. */}
        <div data-lens-tilt className="h-full w-full">
          {member.imageUrl ? (
            // biome-ignore lint/performance/noImgElement: arbitrary remote host — next/image would need per-host config
            <img
              src={member.imageUrl}
              alt={member.name}
              loading="lazy"
              // Intrinsic size + async decode: without these the browser has no
              // dimensions until the bytes land (so the card reflows) and decodes
              // on the main thread, which lands as a dropped frame mid-drag. The
              // numbers are the card's display size, not the file's — they only
              // need to give the right aspect ratio and a sensible layout box.
              width={520}
              height={420}
              decoding="async"
              draggable={false}
              // object-top keeps faces in frame — most headshots sit in the upper
              // portion, and the card crops to a near-square portrait window.
              className="pixelated h-full w-full object-cover object-top select-none [-webkit-user-drag:none]"
            />
          ) : (
            <div className="dot-grid-bg flex h-full w-full items-center justify-center">
              <span className="retro text-5xl text-[#22c55e]/25 select-none">
                {initials(member.name)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="border-t-[6px] border-white/10 px-3 py-3 text-center">
        <span className="retro block truncate text-[11px] text-white">
          {toTitleCase(member.name)}
        </span>
      </div>

      {/* HUD frame lives INSIDE the face so it rotates with the card during the
          flip (a sibling on the wrapper stays flat and looks detached). */}
      <HudCardFrame variant="depth" />
    </Card>
  );
});

const MemberBack = memo(function MemberBack({
  member,
}: {
  member: MemberData;
}) {
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <Card className="h-full justify-start gap-4 border-[#22c55e]/30 py-6 shadow-[0_0_24px_rgba(34,197,94,0.14)]">
      <div className="px-5">
        <p className="retro text-[12px] leading-relaxed text-white">
          {toTitleCase(member.name)}
        </p>
        <p className="retro mt-2 text-[9px] tracking-wider text-[#22c55e]">
          {member.role}
          {member.isAlumni && <span className="text-amber-400"> · ALUMNI</span>}
        </p>
      </div>

      <p className="flex-1 px-5 text-[12px] leading-relaxed text-muted-foreground">
        {member.bio}
      </p>

      <div className="flex items-center justify-center gap-6 px-5">
        {member.linkedin && (
          <a
            href={member.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            onClick={stop}
            aria-label={`${member.name} on LinkedIn`}
            className="cursor-pointer text-white/70 transition-colors duration-200 hover:text-[#22c55e]"
          >
            <FaLinkedin className="size-6" />
          </a>
        )}
        {member.github && (
          <a
            href={member.github}
            target="_blank"
            rel="noopener noreferrer"
            onClick={stop}
            aria-label={`${member.name} on GitHub`}
            className="cursor-pointer text-white/70 transition-colors duration-200 hover:text-[#22c55e]"
          >
            <FaGithub className="size-6" />
          </a>
        )}
        {member.leetcode && (
          <a
            href={member.leetcode}
            target="_blank"
            rel="noopener noreferrer"
            onClick={stop}
            aria-label={`${member.name} on LeetCode`}
            className="cursor-pointer text-white/70 transition-colors duration-200 hover:text-[#22c55e]"
          >
            <SiLeetcode className="size-6" />
          </a>
        )}
      </div>

      {/* HUD frame on the back face too, so the brackets stay attached through
          the whole flip. */}
      <HudCardFrame variant="depth" />
    </Card>
  );
});

// ─── Flip card (front/back, 3D) ───────────────────────────────────────────────
// Takes the index + a stable `onActivate` (not a fresh inline closure) so memo
// actually holds: flipping one card re-renders only that card, not all siblings.
const MemberCard = memo(function MemberCard({
  member,
  index,
  flipped,
  onActivate,
}: {
  member: MemberData;
  index: number;
  flipped: boolean;
  onActivate: (index: number) => void;
}) {
  // The back face is only built once the card has been flipped at least once.
  // Every card used to mount BOTH faces up front — each with its own Card, HUD
  // frame, four brackets, bloom and depth overlays — so a 15-member row carried
  // 30 full card trees inside the 3D context from first paint, all of them
  // composited on every drag frame. `everFlipped` (not `flipped`) keeps it
  // mounted afterwards so the flip-back animation still has something to show.
  const [everFlipped, setEverFlipped] = useState(flipped);
  if (flipped && !everFlipped) setEverFlipped(true);

  return (
    <div
      onClick={() => onActivate(index)}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate(index);
        }
      }}
      className="relative h-full w-full cursor-pointer"
      style={{
        transformStyle: "preserve-3d",
        transition: FLIP_EASE,
        transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backfaceVisibility: "hidden",
          pointerEvents: flipped ? "none" : "auto",
        }}
      >
        <MemberFront member={member} />
      </div>
      {everFlipped && (
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            pointerEvents: flipped ? "auto" : "none",
          }}
        >
          <MemberBack member={member} />
        </div>
      )}
    </div>
  );
});

// ─── Thumb (the small strip either side of the lens) ──────────────────────────
// Decorative twin of the card: the big card in the lens is the real control, so
// thumbs stay out of the tab order and the accessibility tree.
const MemberThumb = memo(function MemberThumb({
  member,
  index,
  onPick,
}: {
  member: MemberData;
  index: number;
  onPick: (index: number) => void;
}) {
  return (
    <div
      aria-hidden
      onClick={() => onPick(index)}
      className="group relative h-full w-full cursor-pointer overflow-hidden border-2 border-white/10 bg-[#0d0d0d] transition-colors duration-200 hover:border-[#22c55e]/60"
    >
      {member.imageUrl ? (
        // biome-ignore lint/performance/noImgElement: arbitrary remote host — next/image would need per-host config
        <img
          src={member.imageUrl}
          alt=""
          loading="lazy"
          width={180}
          height={246}
          decoding="async"
          draggable={false}
          className="pixelated h-full w-full object-cover object-top opacity-80 transition-opacity duration-200 select-none group-hover:opacity-100 [-webkit-user-drag:none]"
        />
      ) : (
        <div className="dot-grid-bg flex h-full w-full items-center justify-center">
          <span className="retro text-2xl text-[#22c55e]/25 select-none">
            {initials(member.name)}
          </span>
        </div>
      )}
      <span className="retro absolute inset-x-0 bottom-0 truncate border-t-2 border-white/10 bg-[#0a0a0a]/85 px-2 py-1.5 text-center text-[7px] text-white/75">
        {toTitleCase(member.name)}
      </span>
    </div>
  );
});

export function MembersSection() {
  const [flipped, setFlipped] = useState<Set<number>>(() => new Set());
  // The lens's clipped window; the bracket power-on looks for cards in here.
  const lensRef = useRef<HTMLDivElement>(null);

  // Responsive sizing so the lens fits a phone screen with thumbs peeking out.
  const vw = useViewportWidth();
  // Phones: the lens takes most of the width. Wider screens: a smaller share,
  // so the thumb strips have room to read as a strip.
  const CARD_W = Math.min(
    MAX_CARD_W,
    Math.round(vw * (vw < LENS_BREAKPOINT ? 0.78 : 0.36)),
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
    count: MEMBERS.length,
    lensWidth: CARD_W,
    thumbWidth: THUMB_W,
    autoAdvanceMs: 4200,
    // Don't let the idle auto-advance yank a card away while its bio is open.
    paused: flipped.size > 0,
    onActivateCenter: (i) =>
      setFlipped((prev) => {
        const nextSet = new Set(prev);
        if (nextSet.has(i)) nextSet.delete(i);
        else nextSet.add(i);
        return nextSet;
      }),
  });

  // GSAP power-on (bracket pop) on the card the row came to rest on — keyed off
  // the SETTLED index, not the live one, so a drag sweeping past ten cards
  // doesn't fire ten bracket animations mid-gesture.
  useCardPowerOn(lensRef, settledIndex);

  return (
    <section
      ref={sectionRef}
      id="members"
      className="relative flex min-h-screen w-full flex-col overflow-hidden py-20 scroll-mt-24"
    >
      {/* Title gets its own row at the top so the cards never cover it. */}
      <div className="shrink-0 pt-28">
        <SectionHeading text="MEMBERS" />
      </div>

      {/* Lens stage: thumbs run out to both sides, the lens sits on top of
          them in the middle (its solid fill is what hides a thumb sliding in). */}
      <div
        className="relative w-full flex-1 cursor-grab touch-pan-y select-none active:cursor-grabbing"
        {...stageHandlers}
      >
        <CoverflowFloor />
        <div className="absolute inset-0">
          {MEMBERS.map((member, i) => (
            <div
              key={member.id}
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
              <MemberThumb member={member} index={i} onPick={onCardClick} />
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
            {MEMBERS.map((member, i) => (
              <div
                key={member.id}
                ref={registerCard(i)}
                data-cf-index={i}
                className="absolute inset-0"
                style={{
                  visibility: i === 0 ? undefined : "hidden",
                  // Inner perspective for the front/back flip.
                  perspective: 1200,
                }}
              >
                <MemberCard
                  member={member}
                  index={i}
                  flipped={flipped.has(i)}
                  onActivate={onCardClick}
                />
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
          // overlaps the name plate.
          counterClassName=""
          counterStyle={counterStyle}
        />
      </div>
    </section>
  );
}
