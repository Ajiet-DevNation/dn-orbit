"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/8bit-card";
import { cn } from "@/lib/utils";

export interface TerminalLine {
  text: string;
  type: "input" | "output" | "comment";
}

interface AboutTerminalProps {
  title?: string;
  lines: TerminalLine[];
  className?: string;
}

// ─── Scroll-scrubbed reveal ──────────────────────────────────────────────────
// The terminal is driven by scroll position, not by a timer. The section is made
// tall and its inner card is pinned (sticky) to the viewport; as you scroll
// through the tall region the card stays put and the transcript types itself out
// in lockstep with the scroll. Because the reveal is bound to scroll offset (not
// a CSS/JS animation), it works identically with prefers-reduced-motion on — the
// media query only neutralises time-based animation, never scroll position.

// Total height of the scroll region, in viewport heights. The first 100vh fills
// the screen as the card pins; the remainder is the "scrub" distance that drives
// typing. Bigger = more scrolling to finish the transcript.
const SECTION_VH = 500;
// Keep the card blank for a short lead-in and finished before it unpins, so the
// pinned moment reads as "stop, watch it type, move on".
const SCRUB_START = 0.08;
const SCRUB_END = 0.82;

// Typing cadence. Scroll events arrive in coarse jumps (a wheel notch can be
// dozens of characters at once), so scroll only sets a *target* character count;
// a rAF loop eases the displayed count toward it. The easing is frame-rate
// *independent* (movement scales with elapsed ms via an exponential approach),
// so a frame dropped during a heavy scroll doesn't produce a visible chunk — the
// cadence stays even. `TAU_MS` is the smoothing time-constant; `READ_CPS` is the
// steady letter-by-letter speed; `FLICK_CPS` lifts the ceiling only when far
// behind (a fast flick) so it catches up without dumping a block of text. All
// pure JS, so prefers-reduced-motion never disables it.
const TAU_MS = 85;
const READ_CPS = 70;
const FLICK_CPS = 420;
const FLICK_GAP = 40;
const MAX_DT_MS = 50; // clamp dt so returning from an idle tab doesn't leap

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function lineClass(type: TerminalLine["type"]): string {
  // Commands glow green like a real shell prompt; comments dim; output neutral.
  if (type === "input") return "text-emerald-300";
  if (type === "comment") return "text-muted-foreground/70";
  return "text-foreground/85";
}

function linePrefix(type: TerminalLine["type"]): string {
  return type === "input" ? "> " : "";
}

// One transcript line. Memoised on its revealed-character count, so a line that
// has finished typing stops re-rendering while the ones below it fill in —
// without it, every character reconciled all ~24 lines.
const TerminalLineView = memo(function TerminalLineView({
  type,
  full,
  revealed,
  typing,
}: {
  type: TerminalLine["type"];
  full: string;
  revealed: number;
  typing: boolean;
}) {
  const shown = full.slice(0, revealed);
  return (
    <p className={cn("retro text-sm leading-relaxed", lineClass(type))}>
      {shown.length ? shown : " "}
      {typing && (
        <span className="cursor-blink ml-0.5 inline-block text-emerald-300">
          ▋
        </span>
      )}
    </p>
  );
});

export function AboutTerminal({
  title = "Terminal",
  lines,
  className,
}: AboutTerminalProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState(0);

  // Smoothing state: `targetRef` is where scroll says we should be; `displayedRef`
  // is the eased float the UI actually renders. `loopRef`/`runningRef` keep a
  // single rAF easing loop that only runs while there's catching up to do;
  // `lastTimeRef` carries the previous frame timestamp for time-based easing.
  const targetRef = useRef(0);
  const displayedRef = useRef(0);
  const loopRef = useRef(0);
  const runningRef = useRef(false);
  const lastTimeRef = useRef(0);

  // Full string for each line (prefix + text); typing walks this combined text.
  const fullLines = useMemo(
    () => lines.map((l) => linePrefix(l.type) + l.text),
    [lines],
  );
  const totalChars = useMemo(
    () => fullLines.reduce((sum, s) => sum + s.length, 0),
    [fullLines],
  );
  // Cumulative start index of each line within the combined transcript, so the
  // global cursor position can be sliced per line without mutating during render.
  const startOffsets = useMemo(() => {
    const offsets: number[] = [];
    let acc = 0;
    for (const s of fullLines) {
      offsets.push(acc);
      acc += s.length;
    }
    return offsets;
  }, [fullLines]);

  // The easing loop: walk `displayedRef` toward `targetRef` a little each frame,
  // committing the integer character count to state. Self-stops once it catches
  // up so we're not running rAF forever; `wake()` restarts it when scroll moves.
  const wake = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    lastTimeRef.current = performance.now();

    const step = (now: number) => {
      const dt = Math.min(now - lastTimeRef.current, MAX_DT_MS);
      lastTimeRef.current = now;

      const diff = targetRef.current - displayedRef.current;

      if (Math.abs(diff) < 0.5) {
        displayedRef.current = targetRef.current;
        runningRef.current = false;
        loopRef.current = 0;
        const next = Math.round(displayedRef.current);
        setTyped((p) => (p === next ? p : next));
        return;
      }

      // Frame-rate-independent exponential ease toward the target…
      let move = diff * (1 - Math.exp(-dt / TAU_MS));
      // …capped to a readable letter cadence (chars/sec × seconds), with the cap
      // lifted only when far behind so a fast flick catches up without dumping.
      const cps = Math.abs(diff) > FLICK_GAP ? FLICK_CPS : READ_CPS;
      const maxMove = (cps / 1000) * dt;
      if (move > maxMove) move = maxMove;
      else if (move < -maxMove) move = -maxMove;
      displayedRef.current += move;

      const next = Math.round(displayedRef.current);
      setTyped((p) => (p === next ? p : next));
      loopRef.current = requestAnimationFrame(step);
    };

    loopRef.current = requestAnimationFrame(step);
  }, []);

  // Map scroll progress through the tall section onto a target character count,
  // then nudge the easing loop awake. Target is purely a function of scroll
  // offset, so reduced-motion never disables it.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let frame = 0;
    // getBoundingClientRect() on every scroll event costs a layout flush even
    // when the terminal is nowhere near the viewport. An IntersectionObserver
    // gates the whole handler so scrolling the rest of the page — including the
    // two coverflow carousels — doesn't pay for this section.
    let inView = false;

    const update = () => {
      frame = 0;
      const el = sectionRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const scrubDistance = rect.height - window.innerHeight;
      // While pinned, rect.top runs from 0 down to -scrubDistance.
      const raw = scrubDistance > 0 ? -rect.top / scrubDistance : 1;
      const progress = clamp01((raw - SCRUB_START) / (SCRUB_END - SCRUB_START));

      targetRef.current = progress * totalChars;
      wake();
    };

    const onScroll = () => {
      if (frame || !inView) return;
      frame = requestAnimationFrame(update);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        // Resync on entry so a jump-scroll (anchor link, refresh mid-page)
        // lands on the right character instead of waiting for the next event.
        if (inView) update();
      },
      // rootMargin keeps it live slightly beyond the viewport, so the state is
      // already correct by the time the card is actually visible.
      { rootMargin: "20% 0px" },
    );
    io.observe(section);

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      io.disconnect();
      if (frame) cancelAnimationFrame(frame);
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
      runningRef.current = false;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [totalChars, wake]);

  // Keep the freshly-typed line in view: the transcript is taller than the fixed
  // screen, so follow the cursor by pinning the scroll to the bottom as it types.
  //
  // Writing a huge scrollTop lets the browser clamp it to the maximum instead of
  // us reading el.scrollHeight — reading it forced a synchronous layout on every
  // single character (~70 per second at the steady cadence), which is the main
  // thing that made the typing feel steppy rather than smooth.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `typed` is the intentional trigger — the effect re-pins the scroll each time a character lands
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = 1e7;
  }, [typed]);

  const allDone = typed >= totalChars;
  // How far into the scrub we are, surfaced as a tiny progress glyph in the
  // title bar so it's obvious the terminal is reacting to the scroll.
  const scrubPct =
    totalChars > 0
      ? Math.round((Math.min(typed, totalChars) / totalChars) * 100)
      : 0;

  // Walk the lines and slice each by how far the global cursor has advanced.
  // Unreached lines render nothing at all (not hidden) — the transcript has to
  // GROW downward for the follow-the-cursor scroll below to sit at the bottom.
  const renderedLines = lines.map((line, idx) => {
    const full = fullLines[idx];
    const start = startOffsets[idx];

    const reached = typed > start || (full.length === 0 && typed >= start);
    if (!reached) return null;

    const revealed = Math.min(full.length, Math.max(0, typed - start));

    return (
      <TerminalLineView
        key={`${line.text}-${idx}`}
        type={line.type}
        full={full}
        revealed={revealed}
        typing={!allDone && revealed < full.length}
      />
    );
  });

  return (
    <section
      ref={sectionRef}
      className={cn("relative w-full", className)}
      style={{ height: `${SECTION_VH}vh` }}
    >
      {/* Pinned viewport-height stage — the card stays centred while the scroll
          scrubs the transcript through it. */}
      <div className="sticky top-0 flex min-h-screen w-full items-center justify-center px-4">
        <div className="mx-auto w-full max-w-5xl">
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
                <span className="retro text-[8px] tabular-nums text-muted-foreground/60">
                  {scrubPct}%
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {/* Fixed-height "screen": CRT scanlines stay pinned over the visible
                  area (outer wrapper) while the transcript scrolls underneath
                  (inner), so the card never resizes as lines fill in. */}
              <div className="terminal-screen">
                <div
                  ref={scrollRef}
                  className="no-scrollbar h-[clamp(22rem,58vh,36rem)] overflow-hidden"
                >
                  <div className="space-y-1.5">
                    {renderedLines}
                    {allDone && (
                      <p className="retro text-sm text-emerald-300">
                        {"> "}
                        <span className="cursor-blink inline-block">▋</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
