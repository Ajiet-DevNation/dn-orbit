// Boilerplate project showcase data. Shapes mirror what the Projects module will
// eventually serve from the DB (see prisma `Project`), so swapping this for a
// server fetch later is a drop-in: same fields, same types.

export interface ProjectData {
  id: string;
  title: string;
  /** Cover image URL, or null to render the 8-bit placeholder. */
  imageUrl: string | null;
  description: string;
  techStack: string[];
  githubUrl: string | null;
  /** Short status tag, e.g. "ACTIVE" / "SHIPPED" / "WIP". */
  status: string;
}

export const PROJECTS: ProjectData[] = [
  {
    id: "orbit",
    title: "ORBIT",
    imageUrl: null,
    description:
      "The platform you're looking at. A full-stack command center for the club — auth, GitHub/LeetCode stat sync, a nightly leaderboard engine, events, and this very showcase.",
    techStack: ["Next.js", "React", "Prisma", "Postgres", "Tailwind"],
    githubUrl: "https://github.com/devnation/orbit",
    status: "ACTIVE",
  },
  {
    id: "pixel-pong",
    title: "PIXEL PONG",
    imageUrl: null,
    description:
      "A retro multiplayer Pong built for the club game night. Real-time rooms over WebSockets, CRT shaders, and a chiptune soundtrack.",
    techStack: ["TypeScript", "WebSockets", "Canvas"],
    githubUrl: "https://github.com/devnation/pixel-pong",
    status: "SHIPPED",
  },
  {
    id: "campus-map",
    title: "CAMPUS MAP",
    imageUrl: null,
    description:
      "An interactive, offline-first map of the AJIET campus with indoor routing, event pins, and an accessibility layer for ramps and lifts.",
    techStack: ["React Native", "MapLibre", "SQLite"],
    githubUrl: "https://github.com/devnation/campus-map",
    status: "WIP",
  },
  {
    id: "leaf",
    title: "LEAF",
    imageUrl: null,
    description:
      "A plant-health scanner that runs a tiny on-device CNN to diagnose crop disease from a phone photo — no connection required.",
    techStack: ["Python", "TensorFlow Lite", "Flutter"],
    githubUrl: "https://github.com/devnation/leaf",
    status: "ACTIVE",
  },
  {
    id: "study-sync",
    title: "STUDY SYNC",
    imageUrl: null,
    description:
      "Shared focus rooms with synced Pomodoro timers, a collaborative whiteboard, and a leaderboard for streaks — built during a 24h hackathon.",
    techStack: ["Next.js", "WebRTC", "Redis"],
    githubUrl: "https://github.com/devnation/study-sync",
    status: "SHIPPED",
  },
  {
    id: "byte-bot",
    title: "BYTE BOT",
    imageUrl: null,
    description:
      "The club's Discord companion: it pulls live LeetCode standings, announces events, and runs daily coding challenges with auto-grading.",
    techStack: ["Node.js", "discord.js", "Prisma"],
    githubUrl: "https://github.com/devnation/byte-bot",
    status: "ACTIVE",
  },
];
