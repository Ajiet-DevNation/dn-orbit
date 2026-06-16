// Real DevNation core-member data, sourced from the "DevNation Core Member
// Directory Profile" responses. Profile photos are self-hosted under
// public/members/ (see public/members/README.md for the Drive→filename mapping).
// Shapes mirror the eventual DB-backed member/profile fields, so swapping for a
// server fetch later is a drop-in: same fields, same types.

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
    id: "twaha",
    name: "Aboobakkar Twaha",
    role: "PRESIDENT",
    imageUrl: "/members/twaha.jpg",
    bio: "Just doing things to the best of my abilities :D",
    linkedin: "https://www.linkedin.com/in/aboobakkar-twaha",
    github: "https://github.com/Twahaaa",
    leetcode: "https://leetcode.com/u/abubakkertwaha/",
  },
  {
    id: "muaz",
    name: "Muaz Ismail Mohammed",
    role: "CORE MEMBER",
    imageUrl: "/members/muaz.jpg",
    bio: "No matter how ridiculous the odds may seem, within us resides the power to overcome these challenges and achieve something beautiful. That one day, we'll look back at where we started and be amazed by how far we have come.",
    linkedin: "https://www.linkedin.com/in/muaz-ismail-mohammed/",
    github: "https://github.com/MuazTPM-YT",
    leetcode: "https://leetcode.com/u/MuazTPM/",
  },
  {
    id: "anirudh-rao",
    name: "Anirudh Rao B",
    role: "CORE MEMBER",
    imageUrl: "/members/anirudh-rao.jpg",
    bio: "The only commit I do is git commit",
    linkedin: "https://www.linkedin.com/in/anirudh-rao-b5488b215",
    github: "https://github.com/ANI-CPU-tech",
    leetcode: "https://leetcode.com/u/Paltryispog/",
  },
  {
    id: "arjun-r",
    name: "Arjun R",
    role: "CORE MEMBER",
    imageUrl: "/members/arjun-r.jpg",
    bio: "Third-year CSE student with a strong interest in software development and AI. Passionate about learning, innovation, and creating meaningful impact through technology. Boom!",
    linkedin: "https://www.linkedin.com/in/arjun-r-44a336294",
    github: "https://github.com/Arjun-333",
    leetcode: null,
  },
  {
    id: "ahmed-shafeel",
    name: "U K Ahmed Shafeel",
    role: "CORE MEMBER",
    imageUrl: "/members/ahmed-shafeel.jpg",
    bio: "Figuring out how to build better things.",
    linkedin: "https://www.linkedin.com/in/ahmedshafeel",
    github: "https://github.com/ShafeelxAhmed",
    leetcode: "https://leetcode.com/u/Shafeel_Ahmed/",
  },
  {
    id: "iffah-zohara",
    name: "Iffah Zohara",
    role: "CORE MEMBER",
    imageUrl: "/members/iffah-zohara.jpg",
    bio: "Just a work in progress.",
    linkedin: "https://www.linkedin.com/in/iffah-zohara-8670bb358",
    github: "https://github.com/iffahzohara057-coder",
    leetcode: "https://leetcode.com/u/iffah_zohara/",
  },
  {
    id: "khushi-kantaria",
    name: "Khushi K Kantaria",
    role: "CORE MEMBER",
    imageUrl: "/members/khushi-kantaria.jpg",
    bio: "Growing through trial and errors.",
    linkedin: "https://www.linkedin.com/in/khushi-kantaria-93469a3b9",
    github: "https://github.com/khushikantaria310",
    leetcode: "https://leetcode.com/u/khushikantaria/",
  },
  {
    id: "jiya-hussain",
    name: "Jiya Hussain",
    role: "CORE MEMBER",
    imageUrl: "/members/jiya-hussain.jpg",
    bio: "It's always Layer 8.",
    linkedin: "https://www.linkedin.com/in/jiya-hussain-7403441b3",
    github: "https://github.com/jiwatec",
    leetcode: "https://leetcode.com/u/chiiaaseed/",
  },
  {
    id: "jizel-dsouza",
    name: "Jizel Prince D'Souza",
    role: "CORE MEMBER",
    imageUrl: "/members/jizel-dsouza.jpg",
    bio: '"I can fix him" — hell nah, fix my code instead.',
    linkedin: "https://www.linkedin.com/in/jizel-prince-dsouza",
    github: "https://github.com/Logizel",
    leetcode: "https://leetcode.com/u/Logizel/",
  },
];
