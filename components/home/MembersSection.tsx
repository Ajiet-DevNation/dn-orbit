"use client";

import { memo, useRef, useState } from "react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { SiLeetcode } from "react-icons/si";
import { Card } from "@/components/ui/8bit-card";
import { MEMBERS, type MemberData } from "@/constants/members";
import { useCardPowerOn } from "@/hooks/useCardPowerOn";
import { useCoverflow } from "@/hooks/useCoverflow";
import { useScrollGlide } from "@/hooks/useScrollGlide";
import { useViewportWidth } from "@/hooks/useViewportWidth";
import { toTitleCase } from "@/lib/names";
import { CoverflowControls, CoverflowFloor } from "./CoverflowControls";
import { HudCardFrame } from "./HudCardFrame";
import { SectionHeading } from "./SectionHeading";

// ─── tuning (desktop reference; scaled to the viewport in the component) ───────
const MAX_CARD_W = 420; // portrait member card width (px) on desktop
const CARD_RATIO = 536 / 392; // height / width (~5:7)
const SPREAD_RATIO = 260 / 420; // centre-to-centre gap / width
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
        {member.imageUrl ? (
          // biome-ignore lint/performance/noImgElement: arbitrary remote host — next/image would need per-host config
          <img
            src={member.imageUrl}
            alt={member.name}
            loading="lazy"
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
    </div>
  );
});

export function MembersSection() {
  const [flipped, setFlipped] = useState<Set<number>>(() => new Set());
  // Wrapper the scroll-glide drifts horizontally (right for members).
  const glideRef = useRef<HTMLDivElement>(null);

  // Responsive sizing so the card fits a phone screen.
  const vw = useViewportWidth();
  const CARD_W = Math.min(MAX_CARD_W, Math.round(vw * 0.82));
  const CARD_H = Math.round(CARD_W * CARD_RATIO);
  const SPREAD = Math.round(CARD_W * SPREAD_RATIO);

  const {
    sectionRef,
    registerCard,
    onCardClick,
    next,
    prev,
    activeIndex,
    count,
    stageHandlers,
  } = useCoverflow({
    count: MEMBERS.length,
    spread: SPREAD,
    tilt: 32,
    depth: 130,
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

  // Scroll-linked horizontal glide: the members row drifts RIGHT as the section
  // travels the viewport. Additive transform on a wrapper, composing with the
  // per-card coverflow transforms.
  useScrollGlide(sectionRef, glideRef, {
    direction: 1,
    distancePx: Math.round(vw * 0.16),
  });

  // GSAP power-on (bracket pop) on the newly-centred member card.
  useCardPowerOn(glideRef, activeIndex);

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

      {/* Coverflow stage fills the rest; cards centre within it. `perspective`
          here is what makes the per-card rotateY/translateZ foreshorten into a
          true 3D cover-flow that spans the full width. */}
      <div
        className="relative w-full flex-1 cursor-grab touch-pan-y select-none active:cursor-grabbing"
        style={{ perspective: 1700 }}
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
          {MEMBERS.map((member, i) => (
            <div
              key={member.id}
              ref={registerCard(i)}
              data-cf-index={i}
              className="absolute left-1/2 top-1/2"
              style={{
                width: CARD_W,
                height: CARD_H,
                marginLeft: -CARD_W / 2,
                marginTop: -CARD_H / 2,
                // Inner perspective for the front/back flip, independent of the
                // stage's cover-flow perspective above.
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
        <CoverflowControls
          onPrev={prev}
          onNext={next}
          index={activeIndex}
          count={count}
          // Sit the counter just below the card's bottom edge (cards centre at
          // the stage midpoint), so it never overlaps the name plate.
          counterClassName=""
          counterStyle={{
            top: `calc(50% + ${Math.round(CARD_H / 2) + 24}px)`,
            bottom: "auto",
          }}
        />
      </div>
    </section>
  );
}
