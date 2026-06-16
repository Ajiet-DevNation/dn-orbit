// Boilerplate member data for the Members carousel. Shapes mirror the eventual
// DB-backed member/profile fields, so swapping for a server fetch later is a
// drop-in: same fields, same types.

export interface MemberData {
  id: string;
  name: string;
  role: string; // e.g. "PRESIDENT" / "CORE MEMBER"
  imageUrl: string | null;
  bio: string;
  linkedin: string | null;
  github: string | null;
  leetcode: string | null;
}

export const MEMBERS: MemberData[] = [
  {
    id: "pres",
    name: "Aisha Rahman",
    role: "PRESIDENT",
    imageUrl: null,
    bio: "Leads DevNation's vision and partnerships. Full-stack dev, hackathon repeat-offender, and the one who keeps the late-night build sessions caffeinated.",
    linkedin: "https://linkedin.com/in/example",
    github: "https://github.com/example",
    leetcode: "https://leetcode.com/example",
  },
  {
    id: "vp",
    name: "Rohan Mehta",
    role: "VICE PRESIDENT",
    imageUrl: null,
    bio: "Runs operations and the event calendar. Backend-leaning, loves distributed systems and a clean Postgres schema.",
    linkedin: "https://linkedin.com/in/example",
    github: "https://github.com/example",
    leetcode: "https://leetcode.com/example",
  },
  {
    id: "tech-lead",
    name: "Sara Pinto",
    role: "TECH LEAD",
    imageUrl: null,
    bio: "Owns the technical roadmap and mentors project teams. Frontend craft, design systems, and a soft spot for pixel art.",
    linkedin: "https://linkedin.com/in/example",
    github: "https://github.com/example",
    leetcode: "https://leetcode.com/example",
  },
  {
    id: "core-1",
    name: "Vivek Nair",
    role: "CORE MEMBER",
    imageUrl: null,
    bio: "ML enthusiast building the on-device models for club projects. Will talk your ear off about transformers.",
    linkedin: "https://linkedin.com/in/example",
    github: "https://github.com/example",
    leetcode: "https://leetcode.com/example",
  },
  {
    id: "core-2",
    name: "Neha Shetty",
    role: "CORE MEMBER",
    imageUrl: null,
    bio: "Design + frontend. Turns Figma into crisp, accessible UI and keeps our components honest.",
    linkedin: "https://linkedin.com/in/example",
    github: "https://github.com/example",
    leetcode: null,
  },
  {
    id: "events",
    name: "Karan Joshi",
    role: "EVENTS LEAD",
    imageUrl: null,
    bio: "Makes the workshops and hackathons actually happen. Logistics wizard, sponsor whisperer.",
    linkedin: "https://linkedin.com/in/example",
    github: null,
    leetcode: "https://leetcode.com/example",
  },
  {
    id: "outreach",
    name: "Fatima Noor",
    role: "OUTREACH",
    imageUrl: null,
    bio: "Grows the community and keeps the socials alive. Writes the recaps everyone actually reads.",
    linkedin: "https://linkedin.com/in/example",
    github: "https://github.com/example",
    leetcode: null,
  },
  {
    id: "treasurer",
    name: "Arjun Dev",
    role: "TREASURER",
    imageUrl: null,
    bio: "Guards the budget and the snack fund. Data-viz hobbyist who makes spreadsheets look good.",
    linkedin: "https://linkedin.com/in/example",
    github: "https://github.com/example",
    leetcode: "https://leetcode.com/example",
  },
];
