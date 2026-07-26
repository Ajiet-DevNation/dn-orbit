import type { TerminalLine } from "@/lib/terminal-typing";
import { AboutTerminal } from "./AboutTerminal";

// The About copy, delivered as a shell session that types itself out when the
// card scrolls into view. Kept to short lines so the pixel font stays readable
// inside the terminal, and grouped so each command answers one question:
// who, why, what we do, who we're part of, what this site is, how to join.
const ABOUT_LINES: TerminalLine[] = [
  { type: "comment", text: "# devnation :: ajiet :: orbit" },
  { type: "input", text: "whoami" },
  {
    type: "output",
    text: "DevNation — the student developer community at AJIET,",
  },
  {
    type: "output",
    text: "A J Institute of Engineering & Technology, Mangaluru.",
  },
  { type: "comment", text: "" },

  { type: "input", text: "cat mission.txt" },
  { type: "output", text: "build real projects, not just assignments." },
  {
    type: "output",
    text: "contribute to open source and ship things that run.",
  },
  { type: "output", text: "learn together, code together, grow together." },
  { type: "comment", text: "" },

  { type: "input", text: "ls ~/activities" },
  { type: "output", text: "hackathons   workshops   peer-coding-nights" },
  { type: "output", text: "tech-talks   open-source-drives   showcases" },
  { type: "comment", text: "" },

  { type: "input", text: "cat nexus.txt" },
  { type: "output", text: "part of Nexus, AJIET's student-led tech umbrella," },
  {
    type: "output",
    text: "collaborating across clubs and powering Srinathon.",
  },
  { type: "comment", text: "" },

  { type: "input", text: "./orbit --status" },
  { type: "output", text: "ORBIT online." },
  // Was "synced nightly" — untrue since the cron was replaced by the on-visit
  // stale-while-revalidate sync (lib/sync.ts).
  { type: "output", text: "github + leetcode stats sync as members visit." },
  { type: "output", text: "leaderboard live · events · projects · members." },
  { type: "comment", text: "" },

  { type: "input", text: "join --devnation" },
  { type: "output", text: "sign in with GitHub. that's the whole onboarding." },
  { type: "output", text: "welcome aboard, developer. let's build. :)" },
];

export function AboutSection() {
  // The terminal renders its own pinned section; this wrapper just carries the
  // #about anchor the header nav scrolls to.
  return (
    <div id="about" className="w-full">
      <AboutTerminal title="devnation@orbit:~" lines={ABOUT_LINES} />
    </div>
  );
}
