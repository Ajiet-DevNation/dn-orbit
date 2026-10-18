import { describe, expect, it } from "bun:test";
import {
  dropDuplicateTitles,
  extractDevNationPane,
  normalizeTitle,
  parseClubEvents,
  parseEventDate,
  toClubAnnouncements,
} from "./club-events";

// Trimmed-down copy of the real student-clubs.php structure: other clubs'
// panes around the DevNation one, headings used as block delimiters, the
// "Programs" gallery labels, entities, and the three date spellings the page
// actually uses. Bodies are abbreviated but keep their original openings.
const PAGE = `<!doctype html>
<html><body>
  <div class="tab-pane fade" id="pills-iot" role="tabpanel"><h3>IOT CLUB EVENTS</h3><p>not devnation</p></div>
  <div class="tab-pane fade" id="pills-devnation" role="tabpanel" aria-labelledby="pills-devnation-tab">
    <div class="bg-color-two">
      <div class="row padding">
        <div class="col-md-8">
          <h3>TECHSNAKES:CODE &amp; CLIMB A TECHNICAL EVENT BY STUDENT DEVELOPMENT CLUB</h3>
          <p>The Student Development Club of A J Institute of Engineering and Technology, in association with the Department of Computer Science &amp; Engineering, had conducted &#8220;Techsnakes: Code &amp; Climb&#8221;, an engaging technical event. Scheduled on April 15, 2026, at 9:30 AM in Venue 426, this event had students compete and climb the leaderboard while showcasing their problem-solving abilities in a fun yet challenging environment for everyone involved.</p>
        </div>
      </div>
      <h3>Programs</h3>
      <div class="row gallery"><div class="gallery-box"><a href="img/clubs/devnation/1.jpg"><img src="img/clubs/devnation/1.jpg" class="img-fluid"></a></div></div>

      <div class="col-md-8">
        <h3>HACKATHON LAUNCHPAD</h3>
        <p>The Student Development Club (DevNation) had organized the event &#8220;HACKATHON LAUNCHPAD&#8221; on 29-11-2025 from 09:00 AM to 1:00PM. The event was conducted for the students of second year CSE.</p>
      </div>
      <h3>Programs</h3>
      <div class="row gallery"></div>

      <div class="col-md-8">
        <h3>Student Development Club – DevNation Inauguration</h3>
        <p>The inauguration of the Student Development Club was held on 05th December 2022 at 10.30am in Seminar hall 3.</p>
      </div>
      <h3>Programs</h3>

      <div class="col-md-8">
        <h3>Session Without A Date</h3>
        <p>The club organized a session and the copy never mentions a calendar date.</p>
      </div>
    </div>
  </div>
  <div class="tab-pane fade" id="pills-skill" role="tabpanel"><h3>SKILL LAB CONTENT</h3><p>must not leak</p></div>
</body></html>`;

describe("parseEventDate", () => {
  it("parses the site's day-first numeric format", () => {
    expect(parseEventDate("held on 27-11-2025 at 9:30AM")?.toISOString()).toBe(
      "2025-11-27T00:00:00.000Z",
    );
    // Day-first matters: 03-01-2023 is Jan 3, not Mar 1.
    expect(
      parseEventDate("on 03-01-2023 in Seminar hall 1")?.toISOString(),
    ).toBe("2023-01-03T00:00:00.000Z");
  });

  it("parses month-name-first dates", () => {
    expect(
      parseEventDate("Scheduled on April 15, 2026, at 9:30 AM")?.toISOString(),
    ).toBe("2026-04-15T00:00:00.000Z");
  });

  it("parses ordinal day-month-name dates", () => {
    expect(
      parseEventDate("held on 05th December 2022 at 10.30am")?.toISOString(),
    ).toBe("2022-12-05T00:00:00.000Z");
    expect(parseEventDate("on 23rd October 2022")?.toISOString()).toBe(
      "2022-10-23T00:00:00.000Z",
    );
  });

  it("ignores partial year ranges and dateless prose", () => {
    expect(parseEventDate("for the academic year 2025-26")).toBeNull();
    expect(parseEventDate("The club organized a session.")).toBeNull();
  });

  it("rejects impossible calendar dates instead of rolling them over", () => {
    expect(parseEventDate("on 32-13-2025")).toBeNull();
    expect(parseEventDate("February 30, 2026 was not a real day")).toBeNull();
  });
});

describe("extractDevNationPane", () => {
  it("throws when the pane is missing", () => {
    expect(() => extractDevNationPane("<html>no panes here</html>")).toThrow(
      /pills-devnation/,
    );
  });

  it("stops at the next club's tab pane", () => {
    const pane = extractDevNationPane(PAGE);
    expect(pane).toContain("TECHSNAKES");
    expect(pane).not.toContain("must not leak");
  });
});

describe("parseClubEvents", () => {
  it("keeps event headings and skips the 'Programs' gallery labels", () => {
    const events = parseClubEvents(PAGE);
    expect(events.map((e) => e.title)).toEqual([
      "TECHSNAKES:CODE & CLIMB A TECHNICAL EVENT BY STUDENT DEVELOPMENT CLUB",
      "HACKATHON LAUNCHPAD",
      "Student Development Club – DevNation Inauguration",
      "Session Without A Date",
    ]);
  });

  it("decodes entities in titles and bodies", () => {
    const [techsnakes] = parseClubEvents(PAGE);
    expect(techsnakes.title).toContain("CODE & CLIMB");
    expect(techsnakes.body).toContain("“Techsnakes: Code & Climb”");
  });

  it("attaches each description to its own event", () => {
    const events = parseClubEvents(PAGE);
    expect(events[1].body).toContain("HACKATHON LAUNCHPAD");
    expect(events[1].body).not.toContain("inauguration");
  });

  it("parses each event's date, leaving undated ones null", () => {
    const events = parseClubEvents(PAGE);
    expect(events.map((e) => e.date?.toISOString() ?? null)).toEqual([
      "2026-04-15T00:00:00.000Z",
      "2025-11-29T00:00:00.000Z",
      "2022-12-05T00:00:00.000Z",
      null,
    ]);
  });

  it("throws when the pane exists but holds no event headings", () => {
    expect(() =>
      parseClubEvents(
        '<div id="pills-devnation"></div><div id="pills-skill"></div>',
      ),
    ).toThrow(/0 events/);
  });
});

describe("toClubAnnouncements", () => {
  const HREF = "https://www.ajiet.edu.in/student-clubs.php";

  it("sorts newest first and caps the list", () => {
    const items = toClubAnnouncements(parseClubEvents(PAGE), {
      max: 2,
      href: HREF,
    });
    expect(items.map((i) => i.title)).toEqual([
      "TECHSNAKES:CODE & CLIMB A TECHNICAL EVENT BY STUDENT DEVELOPMENT CLUB",
      "HACKATHON LAUNCHPAD",
    ]);
  });

  it("sorts undated events after dated ones", () => {
    const items = toClubAnnouncements(parseClubEvents(PAGE), {
      max: 4,
      href: HREF,
    });
    expect(items.at(-1)?.title).toBe("Session Without A Date");
  });

  it("maps to the carousel's announcement shape", () => {
    const [techsnakes] = toClubAnnouncements(parseClubEvents(PAGE), {
      max: 1,
      href: HREF,
    });
    expect(techsnakes.tag).toBe("DEVNATION");
    expect(techsnakes.meta).toBe("APR 15, 2026 · DEVNATION");
    expect(techsnakes.href).toBe(HREF);
    expect(techsnakes.id).toBe(
      "devnation-techsnakes-code-climb-a-technical-event-by-student-development-club-2026-04-15",
    );
  });

  it("trims long bodies to a card-sized teaser", () => {
    const [techsnakes] = toClubAnnouncements(parseClubEvents(PAGE), {
      max: 1,
      href: HREF,
    });
    expect(techsnakes.body?.endsWith("…")).toBe(true);
    expect((techsnakes.body ?? "").length).toBeLessThanOrEqual(161);
  });
});

describe("dropDuplicateTitles", () => {
  it("drops a club card whose title already exists as an event", () => {
    const kept = dropDuplicateTitles(
      [{ title: "Technical session on M.E.R.N" }, { title: "HackElite 2024" }],
      ['Technical session on "MERN"'],
    );
    expect(kept.map((c) => c.title)).toEqual(["HackElite 2024"]);
  });

  it("keeps distinct titles that merely share a prefix", () => {
    const kept = dropDuplicateTitles(
      [{ title: "HackElite 2024" }],
      ["HackElite"],
    );
    expect(kept).toHaveLength(1);
  });

  it("normalizes case, punctuation and whitespace", () => {
    expect(normalizeTitle("  M.E.R.N  ")).toBe("mern");
    expect(normalizeTitle("HACK ELITE-GIT,GITHUB")).toBe("hackelitegitgithub");
  });
});
