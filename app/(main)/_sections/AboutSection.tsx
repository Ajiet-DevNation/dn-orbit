import { AboutTerminal, type TerminalLine } from "./AboutTerminal";

// The About copy, delivered as a fake terminal session that types itself out
// when it scrolls into view. Kept to short lines so the pixel font stays
// readable inside the terminal card.
const ABOUT_LINES: TerminalLine[] = [
  { type: "comment", text: "# devnation :: ajiet :: orbit" },
  { type: "input", text: "whoami" },
  { type: "output", text: "DevNation, the student developer community at AJIET." },
  { type: "output", text: "A J Institute of Engineering & Technology, Mangaluru." },
  { type: "comment", text: "" },
  { type: "input", text: "cat mission.txt" },
  { type: "output", text: "build real projects, not just assignments." },
  { type: "output", text: "contribute to open source and ship things that run." },
  { type: "output", text: "learn together, code together, grow together." },
  { type: "comment", text: "" },
  { type: "input", text: "ls ~/activities" },
  { type: "output", text: "hackathons   workshops   peer-coding-nights" },
  { type: "output", text: "tech-talks   open-source-drives   showcases" },
  { type: "comment", text: "" },
  { type: "input", text: "cat nexus.txt" },
  { type: "output", text: "part of Nexus, AJIET's student-led tech umbrella," },
  { type: "output", text: "collaborating across clubs and powering Srinathon." },
  { type: "comment", text: "" },
  { type: "input", text: "./orbit --status" },
  { type: "output", text: "ORBIT online." },
  { type: "output", text: "github + leetcode stats synced nightly." },
  { type: "output", text: "leaderboard live · events · projects · members." },
  { type: "comment", text: "" },
  { type: "input", text: "join --devnation" },
  { type: "output", text: "welcome aboard, developer. let's build. :)" },
];

export function AboutSection() {
  // The terminal renders its own tall, scroll-scrubbed section; this wrapper just
  // carries the #about anchor the header nav scrolls to.
  return (
    <div id="about" className="w-full">
      <AboutTerminal title="devnation@orbit:~" lines={ABOUT_LINES} />
    </div>
  );
}
