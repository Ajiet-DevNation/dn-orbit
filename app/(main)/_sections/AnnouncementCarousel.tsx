"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/8bit-card";

// Generic announcement — NOT tied to events. Any source (events, club news,
// leaderboard resets, project drops) can be mapped into this shape upstream.
// All fields are plain strings so nothing needs serializing at the boundary.
export interface Announcement {
  id: string;
  tag: string | null; // small chip, e.g. "EVENT" / "WELCOME" / "PROJECTS"
  title: string;
  body: string | null;
  meta: string | null; // trailing line, e.g. "JUL 15 · MAIN AUDITORIUM"
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

function AnnouncementSlide({ item }: { item: Announcement }) {
  return (
    <div
      className="shrink-0"
      style={{ width: CARD_W, marginRight: CARD_GAP }}
    >
      <Card className="min-h-72 justify-between gap-6 py-10 border-white/10 hover:border-[#22c55e]/40 shadow-[0_0_15px_rgba(34,197,94,0.05)] transition-colors duration-500">
        {item.tag && (
          <div className="px-8">
            <span className="retro inline-block border-2 border-[#22c55e] px-3 py-1.5 text-[9px] text-[#22c55e]">
              {item.tag}
            </span>
          </div>
        )}

        <h3 className="retro px-8 text-lg leading-relaxed text-white">
          {item.title}
        </h3>

        {item.body && (
          <p className="px-8 text-sm leading-relaxed text-muted-foreground">
            {item.body}
          </p>
        )}

        {item.meta && (
          <p className="retro px-8 text-[9px] text-muted-foreground">
            {item.meta}
          </p>
        )}
      </Card>
    </div>
  );
}

export function AnnouncementCarousel({
  announcements,
}: AnnouncementCarouselProps) {
  // Real announcements first, then the always-on baseline cards for variety.
  const items = [...announcements, ...BASELINE_ANNOUNCEMENTS];

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

  // Auto-drift loop. Pauses while dragging or when scrolled off-screen.
  useEffect(() => {
    let last = performance.now();
    let rafId = 0;
    const frame = (now: number) => {
      rafId = requestAnimationFrame(frame);
      const dt = now - last;
      last = now;
      if (draggingRef.current || !onScreenRef.current) return;
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
      },
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = offsetRef.current;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    offsetRef.current =
      dragStartOffsetRef.current + (e.clientX - dragStartXRef.current);
    normalize();
    applyTransform();
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
        <div ref={trackRef} className="flex w-max will-change-transform">
          {/* Two identical sets back-to-back → seamless infinite loop. */}
          {[...fillSet, ...fillSet].map((item, i) => (
            <AnnouncementSlide key={`${item.id}-${i}`} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
