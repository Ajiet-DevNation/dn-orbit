"use client";

import { useState } from "react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { SiLeetcode } from "react-icons/si";
import { Card } from "@/components/ui/8bit-card";
import { MEMBERS, type MemberData } from "@/constants/members";
import { SectionHeading } from "./SectionHeading";
import { useDragScrollCarousel } from "./useDragScrollCarousel";

// ─── tuning ──────────────────────────────────────────────────────────────────
const SECTION_VH = 300; // pinned scrub region height
const CARD_W = 260; // solitaire-card width (px)
const CARD_H = 366; // solitaire-card height (~5:7)
const GAP = 40;
const STEP = CARD_W + GAP;

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
function MemberFront({ member }: { member: MemberData }) {
  return (
    <Card className="h-full justify-between gap-0 overflow-hidden border-white/10 py-0 shadow-[0_0_15px_rgba(34,197,94,0.05)]">
      <div className="border-b-[6px] border-white/10 px-3 py-3 text-center">
        <span className="retro text-[8px] tracking-wider text-[#22c55e]">
          {member.role}
        </span>
      </div>

      {/* Picture — ~70% of the card. Plain <img> (pixelated) or pixel placeholder. */}
      <div className="relative flex-1 overflow-hidden bg-[#0d0d0d]">
        {member.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.imageUrl}
            alt={member.name}
            loading="lazy"
            className="pixelated h-full w-full object-cover"
          />
        ) : (
          <div className="dot-grid-bg flex h-full w-full items-center justify-center">
            <span className="retro text-4xl text-[#22c55e]/25 select-none">
              {initials(member.name)}
            </span>
          </div>
        )}
      </div>

      <div className="border-t-[6px] border-white/10 px-3 py-3 text-center">
        <span className="retro block truncate text-[10px] text-white">
          {member.name}
        </span>
      </div>
    </Card>
  );
}

function MemberBack({ member }: { member: MemberData }) {
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <Card className="h-full justify-start gap-3 border-[#22c55e]/30 py-5 shadow-[0_0_24px_rgba(34,197,94,0.12)]">
      <div className="px-4">
        <p className="retro text-[11px] leading-relaxed text-white">
          {member.name}
        </p>
        <p className="retro mt-1.5 text-[8px] tracking-wider text-[#22c55e]">
          {member.role}
        </p>
      </div>

      <p className="flex-1 px-4 text-[11px] leading-relaxed text-muted-foreground">
        {member.bio}
      </p>

      <div className="flex items-center justify-center gap-5 px-4">
        {member.linkedin && (
          <a
            href={member.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            onClick={stop}
            aria-label={`${member.name} on LinkedIn`}
            className="cursor-pointer text-white/70 transition-colors duration-200 hover:text-[#22c55e]"
          >
            <FaLinkedin className="size-5" />
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
            <FaGithub className="size-5" />
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
            <SiLeetcode className="size-5" />
          </a>
        )}
      </div>
    </Card>
  );
}

// ─── Flip card ────────────────────────────────────────────────────────────────
function MemberCard({
  member,
  flipped,
  onToggle,
}: {
  member: MemberData;
  flipped: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="group shrink-0 transition-transform duration-300 ease-out hover:-translate-y-1.5"
      style={{ width: CARD_W, height: CARD_H, perspective: 1000 }}
    >
      <div
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="relative h-full w-full cursor-pointer"
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 500ms var(--ease-out-quart)",
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
    </div>
  );
}

export function MembersSection() {
  const { sectionRef, viewportRef, trackRef, onPointerDown, didDrag } =
    useDragScrollCarousel({ step: STEP });

  // Which cards are showing their back. Multiple may be flipped independently.
  const [flipped, setFlipped] = useState<Set<number>>(() => new Set());

  const toggle = (i: number) => {
    if (didDrag()) return; // a drag, not a tap
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <section
      ref={sectionRef}
      id="members"
      className="relative w-full scroll-mt-24"
      style={{ height: `${SECTION_VH}vh` }}
    >
      <div className="sticky top-0 flex h-screen w-full flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-x-0 top-10 z-10">
          <SectionHeading text="MEMBERS" />
        </div>

        <div
          ref={viewportRef}
          className="w-full cursor-grab touch-pan-y select-none overflow-hidden active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            ref={trackRef}
            className="flex w-max items-center px-[8vw] will-change-transform"
            style={{ gap: GAP }}
          >
            {MEMBERS.map((member, i) => (
              <MemberCard
                key={member.id}
                member={member}
                flipped={flipped.has(i)}
                onToggle={() => toggle(i)}
              />
            ))}
          </div>
        </div>

        <p className="retro absolute bottom-8 z-10 text-[8px] text-muted-foreground/60">
          SCROLL · DRAG · ◀ ▶ — CLICK A CARD TO FLIP
        </p>
      </div>
    </section>
  );
}
