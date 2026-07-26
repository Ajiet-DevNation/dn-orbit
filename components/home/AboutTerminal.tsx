"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/8bit-card";
import {
  activeLineAt,
  buildSchedule,
  charsRevealedAt,
  type TerminalLine,
} from "@/lib/terminal-typing";
import { cn } from "@/lib/utils";

export type { TerminalLine };

interface AboutTerminalProps {
  title?: string;
  lines: TerminalLine[];
  className?: string;
}

// ─── Autoplay typing, inside a short pin ─────────────────────────────────────
//
// This used to be scroll-SCRUBBED across a 500vh section: the transcript's
// progress was a direct function of scrollTop, so the DevNation description
// appeared only as fast as you dragged the scrollbar, un-typed itself when you
// scrolled back up, and needed five screens of scrolling to finish. The "%" in
// the title bar was scroll progress, not a loading indicator.
//
// Now the typing is time-driven and starts when the card comes into view. The
// section keeps a shortened pin so the card stays put while the session plays
// and then releases — scroll holds the terminal in place, it no longer drives
// the text.
//
// Nothing here writes React state per frame. The rAF loop mutates the line
// elements directly, so a ~1400-character session costs zero re-renders. The
// previous version called setTyped() on every frame while catching up.

// Tall enough to hold the card on screen for the length of the session, short
// enough that it isn't a scroll tax. 500vh before.
const SECTION_VH = 200;

function lineClass(type: TerminalLine["type"]): string {
  // Commands glow green like a real shell prompt; comments dim; output neutral.
  if (type === "input") return "text-emerald-300";
  if (type === "comment") return "text-muted-foreground/70";
  return "text-foreground/85";
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export function AboutTerminal({
  title = "Terminal",
  lines,
  className,
}: AboutTerminalProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const percentRef = useRef<HTMLSpanElement>(null);
  const promptRef = useRef<HTMLParagraphElement>(null);
  // One entry per line: the <p>, its text <span>, and its cursor <span>.
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  const schedule = useMemo(() => buildSchedule(lines), [lines]);

  useEffect(() => {
    const section = sectionRef.current;
    const card = cardRef.current;
    if (!section || !card) return;

    const { fullLines, charTimes, lineAppearAt, lineStartIndex, totalMs } =
      schedule;

    // Paint a given revealed-character count straight to the DOM.
    let lastElapsed = 0;
    let lastTyped = -1;
    const paint = (typed: number) => {
      if (typed === lastTyped) return;
      lastTyped = typed;

      const active = activeLineAt(schedule, typed);

      for (let i = 0; i < fullLines.length; i++) {
        const p = lineRefs.current[i];
        if (!p) continue;

        const start = lineStartIndex[i];
        const full = fullLines[i];
        const visible = typed >= start && lastElapsed >= lineAppearAt[i];

        // `hidden` rather than unmounting: the transcript stays in the DOM for
        // search engines and screen readers, and the card never reflows.
        p.style.visibility = visible ? "visible" : "hidden";
        if (!visible) continue;

        const revealed = Math.min(full.length, Math.max(0, typed - start));
        const text = p.firstElementChild as HTMLSpanElement | null;
        const cursor = p.lastElementChild as HTMLSpanElement | null;
        if (text && text.textContent !== full.slice(0, revealed)) {
          text.textContent = full.slice(0, revealed);
        }
        if (cursor) cursor.style.display = i === active ? "" : "none";
      }

      const done = typed >= schedule.totalChars;
      if (promptRef.current) {
        promptRef.current.style.visibility = done ? "visible" : "hidden";
      }

      if (percentRef.current) {
        const pct = schedule.totalChars
          ? Math.round((typed / schedule.totalChars) * 100)
          : 100;
        const label = `${pct}%`;
        if (percentRef.current.textContent !== label) {
          percentRef.current.textContent = label;
        }
      }

      // Follow the cursor: the transcript is taller than the fixed screen.
      const scroller = scrollRef.current;
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
    };

    // Reduced motion: no session, just the finished transcript. The global CSS
    // reset can't flatten a rAF loop, so this has to be handled explicitly.
    if (prefersReducedMotion()) {
      lastElapsed = totalMs;
      paint(schedule.totalChars);
      return;
    }

    // Start blanked. This runs before paint on hydration, so the fully-rendered
    // server markup (good for SEO and no-JS) never flashes.
    lastElapsed = 0;
    paint(0);

    let raf = 0;
    let startedAt = 0;
    let playing = false;

    const frame = (now: number) => {
      if (!startedAt) startedAt = now;
      lastElapsed = now - startedAt;
      paint(charsRevealedAt(charTimes, lastElapsed));

      if (lastElapsed < totalMs) {
        raf = requestAnimationFrame(frame);
        return;
      }
      raf = 0;
      playing = false;
    };

    const play = () => {
      if (playing) return;
      playing = true;
      startedAt = 0;
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      playing = false;
    };

    // Skip to the end on click/tap — a visitor who has read it shouldn't have
    // to wait through the session again.
    const skip = () => {
      stop();
      lastElapsed = totalMs;
      paint(schedule.totalChars);
    };
    card.addEventListener("click", skip);

    // Autoplay on entry; rewind and replay after the section has fully left, so
    // coming back to it shows the session rather than a wall of finished text.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          play();
        } else {
          stop();
          lastElapsed = 0;
          paint(0);
        }
      },
      { threshold: 0.35 },
    );
    io.observe(card);

    const onVisibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      io.disconnect();
      card.removeEventListener("click", skip);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [schedule]);

  return (
    <section
      ref={sectionRef}
      className={cn("relative w-full", className)}
      style={{ height: `${SECTION_VH}vh` }}
    >
      {/* Pinned stage — the card holds still while the session plays, then the
          section releases and the page moves on. */}
      <div className="sticky top-0 flex min-h-screen w-full items-center justify-center px-4">
        <div className="mx-auto w-full max-w-5xl">
          {/* biome-ignore lint/a11y/noStaticElementInteractions: click only skips
              the typing to its end; the content is fully present either way and
              the card is not a control. */}
          <div ref={cardRef} className="cursor-pointer">
            <Card className="about-card bg-background">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="size-2.5 bg-destructive" />
                      <div className="size-2.5 bg-yellow-500" />
                      <div className="size-2.5 bg-green-500" />
                    </div>
                    <CardTitle className="retro text-[10px] text-muted-foreground">
                      {title}
                    </CardTitle>
                  </div>
                  <span
                    ref={percentRef}
                    className="retro text-[8px] tabular-nums text-muted-foreground/60"
                  >
                    0%
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {/* Fixed-height "screen": CRT scanlines stay pinned over the
                    visible area while the transcript scrolls underneath, so the
                    card never resizes as lines fill in. */}
                <div className="terminal-screen">
                  <div
                    ref={scrollRef}
                    className="no-scrollbar h-[clamp(22rem,58vh,36rem)] overflow-hidden"
                  >
                    <div className="space-y-1.5">
                      {lines.map((line, idx) => (
                        <p
                          // biome-ignore lint/suspicious/noArrayIndexKey: the
                          // transcript is a fixed, ordered script — index IS the
                          // identity, and blank lines repeat.
                          key={idx}
                          ref={(el) => {
                            lineRefs.current[idx] = el;
                          }}
                          className={cn(
                            "retro text-sm leading-relaxed",
                            lineClass(line.type),
                          )}
                        >
                          {/* Text and cursor are separate elements so the rAF
                              loop can rewrite one without touching the other. */}
                          <span>{schedule.fullLines[idx] || " "}</span>
                          <span
                            className="cursor-blink ml-0.5 inline-block text-emerald-300"
                            style={{ display: "none" }}
                          >
                            ▋
                          </span>
                        </p>
                      ))}
                      <p
                        ref={promptRef}
                        className="retro text-sm text-emerald-300"
                        style={{ visibility: "hidden" }}
                      >
                        {"> "}
                        <span className="cursor-blink inline-block">▋</span>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
