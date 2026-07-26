import { describe, expect, test } from "bun:test";
import {
  activeLineAt,
  buildSchedule,
  charsRevealedAt,
  LEAD_IN_MS,
  linePrefix,
  MS_PER_CHAR,
  PAUSE_BEFORE_COMMAND_MS,
  type TerminalLine,
} from "./terminal-typing";

const SESSION: TerminalLine[] = [
  { type: "comment", text: "# devnation" },
  { type: "input", text: "whoami" },
  { type: "output", text: "DevNation." },
  { type: "comment", text: "" },
  { type: "input", text: "exit" },
];

describe("linePrefix", () => {
  test("only commands get a prompt", () => {
    expect(linePrefix("input")).toBe("> ");
    expect(linePrefix("output")).toBe("");
    expect(linePrefix("comment")).toBe("");
  });
});

describe("buildSchedule", () => {
  const s = buildSchedule(SESSION);

  test("prefixes commands in the rendered text", () => {
    expect(s.fullLines[1]).toBe("> whoami");
    expect(s.fullLines[2]).toBe("DevNation.");
  });

  test("counts every character of the transcript", () => {
    const expected = s.fullLines.reduce((n, l) => n + l.length, 0);
    expect(s.totalChars).toBe(expected);
    expect(s.charTimes).toHaveLength(expected);
  });

  test("times strictly increase, so playback never goes backwards", () => {
    for (let i = 1; i < s.charTimes.length; i++) {
      expect(s.charTimes[i]).toBeGreaterThan(s.charTimes[i - 1]);
    }
  });

  test("opens with the lead-in pause", () => {
    expect(s.lineAppearAt[0]).toBe(LEAD_IN_MS);
    expect(s.charTimes[0]).toBe(LEAD_IN_MS + MS_PER_CHAR.comment);
  });

  test("waits longer before a command than before output", () => {
    const beforeCommand =
      s.lineAppearAt[1] - s.charTimes[s.fullLines[0].length - 1];
    const beforeOutput =
      s.lineAppearAt[2] -
      s.charTimes[s.fullLines[0].length + s.fullLines[1].length - 1];
    expect(beforeCommand).toBe(PAUSE_BEFORE_COMMAND_MS);
    expect(beforeOutput).toBeLessThan(beforeCommand);
  });

  test("types commands slower than output", () => {
    const cmdChar = MS_PER_CHAR.input;
    const outChar = MS_PER_CHAR.output;
    expect(cmdChar).toBeGreaterThan(outChar);
  });

  test("a blank line still consumes a beat", () => {
    // Line 3 is empty: it contributes no characters but must push line 4 later.
    expect(s.fullLines[3]).toBe("");
    expect(s.lineAppearAt[4]).toBeGreaterThan(s.lineAppearAt[3]);
  });

  test("line start indices partition the transcript", () => {
    for (let i = 1; i < s.lineStartIndex.length; i++) {
      expect(s.lineStartIndex[i]).toBe(
        s.lineStartIndex[i - 1] + s.fullLines[i - 1].length,
      );
    }
  });

  test("totalMs is when the last character lands", () => {
    expect(s.totalMs).toBe(s.charTimes[s.charTimes.length - 1]);
  });

  test("handles an empty transcript without throwing", () => {
    const empty = buildSchedule([]);
    expect(empty.totalChars).toBe(0);
    expect(empty.totalMs).toBe(0);
    expect(charsRevealedAt(empty.charTimes, 9999)).toBe(0);
  });
});

describe("charsRevealedAt", () => {
  const s = buildSchedule(SESSION);

  test("nothing is revealed before the lead-in", () => {
    expect(charsRevealedAt(s.charTimes, 0)).toBe(0);
    expect(charsRevealedAt(s.charTimes, LEAD_IN_MS)).toBe(0);
  });

  test("reveals the first character exactly on its scheduled ms", () => {
    expect(charsRevealedAt(s.charTimes, s.charTimes[0])).toBe(1);
    expect(charsRevealedAt(s.charTimes, s.charTimes[0] - 1)).toBe(0);
  });

  test("everything is revealed at and after totalMs", () => {
    expect(charsRevealedAt(s.charTimes, s.totalMs)).toBe(s.totalChars);
    expect(charsRevealedAt(s.charTimes, s.totalMs + 10_000)).toBe(s.totalChars);
  });

  test("is monotonic across the whole timeline", () => {
    let previous = 0;
    for (let t = 0; t <= s.totalMs + 100; t += 7) {
      const n = charsRevealedAt(s.charTimes, t);
      expect(n).toBeGreaterThanOrEqual(previous);
      previous = n;
    }
  });

  test("a skipped frame lands in the same place as many small ones", () => {
    // The whole point of scheduling rather than accumulating: jumping straight
    // to t must equal stepping there.
    const t = s.totalMs / 2;
    expect(charsRevealedAt(s.charTimes, t)).toBe(
      charsRevealedAt(s.charTimes, t),
    );
    let stepped = 0;
    for (let i = 0; i <= t; i += 3) stepped = charsRevealedAt(s.charTimes, i);
    expect(stepped).toBe(charsRevealedAt(s.charTimes, Math.floor(t / 3) * 3));
  });
});

describe("activeLineAt", () => {
  const s = buildSchedule(SESSION);

  test("mid-line reports that line", () => {
    const start = s.lineStartIndex[1];
    expect(activeLineAt(s, start + 2)).toBe(1);
  });

  test("reports none once a line is complete and the next hasn't started", () => {
    const endOfLine1 = s.lineStartIndex[1] + s.fullLines[1].length;
    expect(activeLineAt(s, endOfLine1)).toBe(-1);
  });

  test("reports none when the transcript is finished", () => {
    expect(activeLineAt(s, s.totalChars)).toBe(-1);
  });
});
