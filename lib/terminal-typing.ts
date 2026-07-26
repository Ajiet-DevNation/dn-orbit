// Typing schedule for the About terminal.
//
// Pure and time-based: given the transcript, it precomputes the exact
// millisecond at which each character and each line appears. The component then
// just asks "how much is revealed at elapsed = t?" every frame, which makes the
// playback deterministic, unit-testable, and independent of frame rate — a
// dropped frame changes nothing about what is on screen a moment later.

export type TerminalLineType = "input" | "output" | "comment";

export interface TerminalLine {
  text: string;
  type: TerminalLineType;
}

// ── Cadence ──────────────────────────────────────────────────────────────────
// Commands type slowly, like someone at a keyboard. Output dumps fast, like a
// program printing. The gap between the two is what makes it read as a session
// rather than as one long string being revealed.
export const LEAD_IN_MS = 260;
export const PAUSE_BEFORE_COMMAND_MS = 430;
export const PAUSE_BEFORE_OUTPUT_MS = 90;
export const PAUSE_BLANK_LINE_MS = 240;
export const MS_PER_CHAR = {
  input: 45,
  output: 12,
  comment: 16,
} as const;

/** `> ` in front of commands, nothing otherwise. */
export function linePrefix(type: TerminalLineType): string {
  return type === "input" ? "> " : "";
}

export interface TypingSchedule {
  /** Full rendered text of each line, prefix included. */
  fullLines: string[];
  /** Cumulative ms at which each character of the whole transcript appears. */
  charTimes: number[];
  /** Ms at which each line becomes visible (its leading pause has elapsed). */
  lineAppearAt: number[];
  /** Index of the first character of each line within the transcript. */
  lineStartIndex: number[];
  /** Total transcript length in characters. */
  totalChars: number;
  /** Ms at which the last character lands. */
  totalMs: number;
}

export function buildSchedule(lines: TerminalLine[]): TypingSchedule {
  const fullLines = lines.map((l) => linePrefix(l.type) + l.text);
  const charTimes: number[] = [];
  const lineAppearAt: number[] = [];
  const lineStartIndex: number[] = [];

  let t = 0;
  let index = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const full = fullLines[i];

    if (i === 0) {
      t += LEAD_IN_MS;
    } else if (full.length === 0) {
      // A blank line is a beat, not a pause plus nothing.
      t += PAUSE_BLANK_LINE_MS;
    } else if (line.type === "input") {
      t += PAUSE_BEFORE_COMMAND_MS;
    } else {
      t += PAUSE_BEFORE_OUTPUT_MS;
    }

    lineAppearAt.push(t);
    lineStartIndex.push(index);

    const per = MS_PER_CHAR[line.type];
    for (let c = 0; c < full.length; c++) {
      t += per;
      charTimes.push(t);
    }
    index += full.length;
  }

  return {
    fullLines,
    charTimes,
    lineAppearAt,
    lineStartIndex,
    totalChars: index,
    totalMs: t,
  };
}

/**
 * How many characters are revealed at `elapsed` ms.
 *
 * Binary search over the precomputed times — O(log n) per frame regardless of
 * transcript length, and exact rather than accumulated, so it never drifts.
 */
export function charsRevealedAt(charTimes: number[], elapsed: number): number {
  let lo = 0;
  let hi = charTimes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (charTimes[mid] <= elapsed) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Index of the line currently being typed, or -1 once everything is out. */
export function activeLineAt(schedule: TypingSchedule, typed: number): number {
  const { lineStartIndex, fullLines } = schedule;
  for (let i = fullLines.length - 1; i >= 0; i--) {
    if (typed > lineStartIndex[i]) {
      return typed < lineStartIndex[i] + fullLines[i].length ? i : -1;
    }
  }
  return typed > 0 ? -1 : 0;
}
