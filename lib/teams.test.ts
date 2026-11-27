import { describe, expect, it } from "bun:test";
import {
  formatTeamCode,
  generateTeamCode,
  isWellFormedTeamCode,
  matchValueFor,
  normalizeTeamCode,
  parseTeamConfig,
  TEAM_CODE_LEN,
  type TeamConfig,
  teamEventFull,
  teamNameError,
  teamNameKey,
  teamSizeLabel,
  teamStatus,
  validateTeamChoice,
} from "./teams";

const CTF: TeamConfig = {
  minSize: 4,
  maxSize: 6,
  maxTeams: 12,
  matchFieldId: "branch",
};

describe("parseTeamConfig", () => {
  it("returns null for an individual event", () => {
    expect(parseTeamConfig(null)).toBeNull();
    expect(parseTeamConfig(undefined)).toBeNull();
  });

  it("parses a full config and defaults the optional keys", () => {
    expect(parseTeamConfig(CTF)).toEqual(CTF);
    expect(parseTeamConfig({ minSize: 2, maxSize: 3 })).toEqual({
      minSize: 2,
      maxSize: 3,
      maxTeams: null,
      matchFieldId: null,
    });
  });

  it("treats a malformed config as individual instead of throwing", () => {
    expect(parseTeamConfig({ minSize: 6, maxSize: 4 })).toBeNull();
    expect(parseTeamConfig({ minSize: "4", maxSize: 6 })).toBeNull();
    expect(parseTeamConfig("teams")).toBeNull();
  });
});

describe("team names", () => {
  it("accepts ordinary names and tidies whitespace", () => {
    expect(teamNameError("Byte Me")).toBeNull();
    expect(teamNameError("  null   pointers  ")).toBeNull();
    expect(teamNameError("Team #7 & co.")).toBeNull();
    expect(teamNameError("ಕನ್ನಡ Coders")).toBeNull();
  });

  it("rejects empty, short, long and odd names", () => {
    expect(teamNameError("   ")).toBe("Team name is required");
    expect(teamNameError("A")).toContain("at least");
    expect(teamNameError("x".repeat(33))).toContain("at most");
    expect(teamNameError("<script>")).toContain("only");
    expect(teamNameError("-dash first")).toContain("only");
    expect(teamNameError("=SUM(A1)")).toContain("only");
  });

  it("compares names ignoring case and spacing", () => {
    expect(teamNameKey(" Byte   ME ")).toBe(teamNameKey("byte me"));
  });
});

describe("invite codes", () => {
  it("generates well-formed codes without look-alike characters", () => {
    for (let i = 0; i < 500; i++) {
      const code = generateTeamCode();
      expect(code).toHaveLength(TEAM_CODE_LEN);
      expect(isWellFormedTeamCode(code)).toBe(true);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it("does not repeat in a small sample", () => {
    const seen = new Set(Array.from({ length: 1000 }, generateTeamCode));
    expect(seen.size).toBe(1000);
  });

  it("normalizes what people type and formats for display", () => {
    expect(normalizeTeamCode(" k7qx-29md ")).toBe("K7QX29MD");
    expect(formatTeamCode("K7QX29MD")).toBe("K7QX-29MD");
    expect(normalizeTeamCode(formatTeamCode("K7QX29MD"))).toBe("K7QX29MD");
  });

  it("rejects codes of the wrong length or alphabet", () => {
    expect(isWellFormedTeamCode("K7QX29M")).toBe(false);
    expect(isWellFormedTeamCode("K7QX29M0")).toBe(false);
  });
});

describe("validateTeamChoice", () => {
  it("requires a choice", () => {
    const r = validateTeamChoice(null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.team).toBeDefined();
  });

  it("cleans a valid create", () => {
    expect(
      validateTeamChoice({ action: "create", name: " Byte  Me " }),
    ).toEqual({ ok: true, value: { action: "create", name: "Byte Me" } });
  });

  it("puts a bad name on teamName", () => {
    const r = validateTeamChoice({ action: "create", name: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.teamName).toBeDefined();
  });

  it("normalizes a valid join code", () => {
    expect(validateTeamChoice({ action: "join", code: "k7qx-29md" })).toEqual({
      ok: true,
      value: { action: "join", code: "K7QX29MD" },
    });
  });

  it("puts a bad code on teamCode", () => {
    for (const code of ["", "ABC", "K7QX-29M0"]) {
      const r = validateTeamChoice({ action: "join", code });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.teamCode).toBeDefined();
    }
  });
});

describe("matchValueFor", () => {
  it("reads the match field's answer", () => {
    expect(matchValueFor(CTF, { branch: "CSE" })).toBe("CSE");
    expect(matchValueFor(CTF, {})).toBeNull();
    expect(
      matchValueFor({ ...CTF, matchFieldId: null }, { branch: "CSE" }),
    ).toBeNull();
  });
});

describe("team and event state", () => {
  it("classifies team size against the limits", () => {
    expect(teamStatus(1, CTF)).toBe("incomplete");
    expect(teamStatus(3, CTF)).toBe("incomplete");
    expect(teamStatus(4, CTF)).toBe("complete");
    expect(teamStatus(5, CTF)).toBe("complete");
    expect(teamStatus(6, CTF)).toBe("full");
  });

  it("is full only when no team can be made and no seat is open", () => {
    expect(teamEventFull(CTF, [])).toBe(false);
    expect(teamEventFull(CTF, Array(11).fill(6))).toBe(false);
    expect(teamEventFull(CTF, [...Array(11).fill(6), 5])).toBe(false);
    expect(teamEventFull(CTF, Array(12).fill(6))).toBe(true);
    expect(teamEventFull({ ...CTF, maxTeams: null }, Array(50).fill(6))).toBe(
      false,
    );
  });

  it("labels the size range", () => {
    expect(teamSizeLabel(CTF)).toBe("4–6 members");
    expect(teamSizeLabel({ ...CTF, minSize: 3, maxSize: 3 })).toBe("3 members");
  });
});
