"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/8bit-card";
import { cn } from "@/lib/utils";
import campusAnnouncements from "@/constants/campusAnnouncements.json";

// Generic announcement — NOT tied to events. Any source (events, club news,
// leaderboard resets, project drops) can be mapped into this shape upstream.
// All fields are plain strings so nothing needs serializing at the boundary.
export interface Announcement {
  id: string;
  tag: string | null; // small chip, e.g. "EVENT" / "WELCOME" / "PROJECTS"
  title: string;
  body: string | null;
  meta: string | null; // trailing line, e.g. "JUL 15 · MAIN AUDITORIUM"
  href?: string | null; // when set, the whole card links out (opens new tab)
}

interface AnnouncementCarouselProps {
  announcements: Announcement[];
}

// One card's footprint: width (CARD_W) + right margin (CARD_GAP). Used to figure
// out how many cards are needed to fill the screen and how far one loop spans.
const CARD_W = 550;
const CARD_GAP = 50;
const UNIT = CARD_W + CARD_GAP;
const SPEED = 0.05; // px per ms ≈ 50px/s drift

// Real campus news scraped from the college site (ajiet.edu.in → "News &
// Events") into constants/campusAnnouncements.json by scripts/scrapeAnnouncements.ts,
// refreshed weekly via .github/workflows/scrape-announcements.yml. Each card
// links out to its source page. All carry the "AJIET" tag so the source is clear.
const CAMPUS_ANNOUNCEMENTS: Announcement[] = campusAnnouncements;

// Always-on generic announcements blended in alongside live data (events, etc).
// These give the strip variety so it never looks like one card on repeat when
// there are only a couple of real announcements.
const BASELINE_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "baseline-welcome",
    tag: "WELCOME",
    title: "WELCOME TO ORBIT",
    body: "Your DevNation command center is live.",
    meta: null,
  },
  {
    id: "baseline-leaderboard",
    tag: "LEADERBOARD",
    title: "SEASON 1 IS LIVE",
    body: "Climb the ranks — scores update nightly.",
    meta: "RESETS MONTHLY",
  },
  {
    id: "baseline-projects",
    tag: "PROJECTS",
    title: "SHOWCASE IS OPEN",
    body: "Submit your build to the projects board.",
    meta: "> /projects/new",
  },
];

function AnnouncementSlide({
  item,
  onNavGuard,
}: {
  item: Announcement;
  // Suppresses navigation if the pointer was dragging the strip (so a drag that
  // happens to end on a card doesn't fire its link).
  onNavGuard: (e: React.MouseEvent) => void;
}) {
  const card = (
    // h-full (not a fixed length) so the Card fills the fixed-height wrapper
    // below: the Card spreads `className` onto both its outer bordered box AND
    // its inner content div, and a fixed length there would make the inner
    // overflow the outer's content area and cover the bottom border. h-full is a
    // percentage, so it resolves against each parent's content box and fits.
    <Card
      className={cn(
        "h-full gap-4 py-8 border-white/10 shadow-[0_0_15px_rgba(34,197,94,0.05)] transition-colors duration-500",
        // Linked cards get a stronger hover cue than passive ones.
        item.href ? "hover:border-[#22c55e]/70" : "hover:border-[#22c55e]/40"
      )}
    >
      {item.tag && (
        <div className="px-8">
          <span className="retro inline-block border-2 border-[#22c55e] px-3 py-1.5 text-[9px] text-[#22c55e]">
            {item.tag}
          </span>
        </div>
      )}

      <h3 className="retro px-8 text-lg leading-relaxed text-white line-clamp-3">
        {item.title}
      </h3>

      {item.body && (
        <p className="px-8 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {item.body}
        </p>
      )}

      {/* mt-auto pins the meta row to the bottom edge of every card. */}
      <div className="mt-auto flex items-center justify-between gap-4 px-8">
        {item.meta && (
          <p className="retro text-[9px] text-muted-foreground">{item.meta}</p>
        )}
        {item.href && (
          <span className="retro text-[9px] text-[#22c55e]">VIEW &rarr;</span>
        )}
      </div>
    </Card>
  );

  return (
    // Fixed height lives here (the definite parent); the Card fills it via
    // h-full. Keeps every card identical without the inner div overflowing.
    <div
      className="shrink-0 h-[21rem]"
      style={{ width: CARD_W, marginRight: CARD_GAP }}
    >
      {item.href ? (
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          title={item.title}
          draggable={false}
          onClick={onNavGuard}
          className="block h-full rounded-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#22c55e]"
        >
          {card}
        </a>
      ) : (
        card
      )}
    </div>
  );
}

export function AnnouncementCarousel({
  announcements,
}: AnnouncementCarouselProps) {
  // Live announcements first, then real campus news, then the always-on
  // baseline cards for variety.
  const items = [
    ...announcements,
    ...CAMPUS_ANNOUNCEMENTS,
    ...BASELINE_ANNOUNCEMENTS,
  ];

  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // How many cards make up ONE loop set — enough to overflow the screen so it
  // always looks full, even with just 1–2 real announcements (circular repeat).
  const [fillCount, setFillCount] = useState(items.length);

  useEffect(() => {
    const calc = () => {
      const needed = Math.ceil((window.innerWidth * 1.4) / UNIT) + 1;
      setFillCount(Math.max(items.length, needed));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [items.length]);

  const fillSet = Array.from(
    { length: fillCount },
    (_, i) => items[i % items.length]
  );
  const copyWidth = fillCount * UNIT;

  // Live, mutable animation/drag state kept in refs so the rAF loop reads the
  // latest values without re-subscribing every render.
  const offsetRef = useRef(0);
  const draggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const onScreenRef = useRef(true);
  // True once a pointer-down has moved far enough to count as a drag — used to
  // cancel the click that would otherwise follow and open a card's link.
  const movedRef = useRef(false);

  // Keep offset within (-copyWidth, 0] so the two stacked copies loop seamlessly.
  const normalize = () => {
    if (copyWidth <= 0) return;
    while (offsetRef.current <= -copyWidth) offsetRef.current += copyWidth;
    while (offsetRef.current > 0) offsetRef.current -= copyWidth;
  };

  const applyTransform = () => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(${offsetRef.current}px,0,0)`;
    }
  };

  // Auto-drift loop. Pauses while dragging, when scrolled off-screen, or when
  // the user prefers reduced motion (the strip then holds still; drag still works).
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let last = performance.now();
    let rafId = 0;
    const frame = (now: number) => {
      rafId = requestAnimationFrame(frame);
      const dt = now - last;
      last = now;
      if (draggingRef.current || !onScreenRef.current || reduce) return;
      offsetRef.current -= SPEED * dt;
      normalize();
      applyTransform();
    };
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
    // copyWidth in deps so normalize uses the right span after a resize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copyWidth]);

  // Pause the drift when the carousel isn't visible (saves cycles).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreenRef.current = entry.isIntersecting;
        // Promote the marquee track to its own layer only while it's visible
        // (and therefore drifting); demote off-screen so it's not held idle.
        if (trackRef.current)
          trackRef.current.style.willChange = entry.isIntersecting
            ? "transform"
            : "";
      },
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    movedRef.current = false;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = offsetRef.current;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartXRef.current;
    // 5px of travel distinguishes a deliberate drag from a jittery click.
    if (Math.abs(dx) > 5) movedRef.current = true;
    offsetRef.current = dragStartOffsetRef.current + dx;
    normalize();
    applyTransform();
  };

  // Runs on a card's click (capture-phase via the anchor's onClick). If the
  // pointer was dragging, cancel the navigation.
  const onNavGuard = (e: React.MouseEvent) => {
    if (movedRef.current) e.preventDefault();
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <section id="announcements" className="w-full overflow-hidden py-12">
      <h2 className="retro mb-12 text-center text-xl tracking-wider text-white">
        ANNOUNCEMENTS
      </h2>

      {/*
        Drag anywhere on the strip to scrub it; release and the drift resumes.
        Right-click context menu is suppressed so right-drag works too.
        cursor-grab / active:cursor-grabbing signals it's draggable.
      */}
      <div
        ref={containerRef}
        className="relative cursor-grab touch-pan-y select-none overflow-hidden active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div ref={trackRef} className="flex w-max">
          {/* Two identical sets back-to-back → seamless infinite loop. */}
          {[...fillSet, ...fillSet].map((item, i) => (
            <AnnouncementSlide
              key={`${item.id}-${i}`}
              item={item}
              onNavGuard={onNavGuard}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
