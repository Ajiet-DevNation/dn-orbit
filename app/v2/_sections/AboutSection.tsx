import Advanced1, { type TerminalLine } from "@/components/ui/8bit-advanced1";

// The About copy, delivered as a fake terminal session. Kept to short lines so
// the pixel font stays readable inside the terminal card.
const ABOUT_LINES: TerminalLine[] = [
  { type: "comment", text: "# devnation :: nexus :: orbit" },
  { type: "input", text: "whoami" },
  { type: "output", text: "DevNation — AJIET's student dev community." },
  { type: "output", text: "the project-building cluster at AJIET." },
  { type: "output", text: "ship code · contribute to OSS · grow together." },
  { type: "comment", text: "" },
  { type: "input", text: "cat nexus.txt" },
  { type: "output", text: "part of Nexus — a student-led tech club from" },
  { type: "output", text: "Srinivas Institute of Technology, Mangalore." },
  { type: "output", text: "clusters across colleges · runs Srinathon." },
  { type: "comment", text: "" },
  { type: "input", text: "./orbit --status" },
  { type: "output", text: "ORBIT online." },
  { type: "output", text: "github + leetcode stats synced." },
  { type: "output", text: "leaderboard recomputed nightly." },
  { type: "output", text: "events // projects // members — all in orbit." },
];

export function AboutSection() {
  return (
    <section id="about" className="w-full px-6 py-16">
      <h2 className="retro mb-4 text-center text-xl tracking-wider text-white">
        ABOUT
      </h2>
      <p className="mx-auto mb-10 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
        DevNation — AJIET&apos;s project-building cluster of the Nexus tech club,
        with ORBIT as mission control.
      </p>

      <Advanced1
        title="devnation@orbit:~"
        lines={ABOUT_LINES}
        className="py-0"
      />
    </section>
  );
}
