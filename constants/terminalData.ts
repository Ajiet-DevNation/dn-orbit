/* ── Terminal Mock Data ── */

export interface TerminalMember {
  name: string;
  role: string;
  handle: string;
  bio: string;
  avatar: string;
  social: string;
  status: "active" | "idle" | "offline";
}

export interface TerminalProject {
  name: string;
  description: string;
  tech: string[];
  image: string;
  repoUrl: string;
  status: "stable" | "experimental" | "archived";
}

export const TERMINAL_MEMBERS: TerminalMember[] = [
  {
    name: "ELIAS VANCE",
    role: "SYSTEM_ARCHITECT",
    handle: "@EV0_A2",
    bio: "Distributed systems specialist. Architected the core mesh network and cluster orchestration layer.",
    avatar: "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=elias",
    social: "https://github.com/eliasvance",
    status: "active",
  },
  {
    name: "SARAH KOVACS",
    role: "ML_ENGINEER",
    handle: "@S_KOVACS",
    bio: "Neural network optimization and transformer architecture research. 40k+ model parameters tuned.",
    avatar: "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=sarah",
    social: "https://github.com/sarahkovacs",
    status: "active",
  },
  {
    name: "MARCUS WEBB",
    role: "DATA_ANALYST",
    handle: "@M_WEBB",
    bio: "Data pipeline architecture and real-time analytics dashboards. PostgreSQL and time-series expert.",
    avatar: "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=marcus",
    social: "https://github.com/marcuswebb",
    status: "idle",
  },
  {
    name: "NOVA CHEN",
    role: "FRONTEND_DEV",
    handle: "@NOVA_C",
    bio: "UI systems engineer. Built the component library and design token pipeline from scratch.",
    avatar: "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=nova",
    social: "https://github.com/novachen",
    status: "active",
  },
  {
    name: "RAJ PATEL",
    role: "BACKEND_DEV",
    handle: "@RAJ_P",
    bio: "API design and microservices. Maintains the auth layer and rate-limiting infrastructure.",
    avatar: "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=raj",
    social: "https://github.com/rajpatel",
    status: "offline",
  },
  {
    name: "LUNA FROST",
    role: "SECURITY_OPS",
    handle: "@L_FROST",
    bio: "Penetration testing and vulnerability assessment. CTF champion and encryption protocol designer.",
    avatar: "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=luna",
    social: "https://github.com/lunafrost",
    status: "active",
  },
];

export const TERMINAL_PROJECTS: TerminalProject[] = [
  {
    name: "NEURAL_VAULT",
    description: "Encrypted neural network model storage with access-controlled inference pipelines and automated versioning.",
    tech: ["PYTHON", "TENSORFLOW", "DOCKER"],
    image: "https://api.dicebear.com/9.x/shapes/svg?seed=neural",
    repoUrl: "https://github.com/devnation/neural-vault",
    status: "stable",
  },
  {
    name: "GHOST_ENCRYPT",
    description: "End-to-end encrypted messaging protocol with zero-knowledge proof authentication and decentralized key exchange.",
    tech: ["RUST", "WASM", "WEBRTC"],
    image: "https://api.dicebear.com/9.x/shapes/svg?seed=ghost",
    repoUrl: "https://github.com/devnation/ghost-encrypt",
    status: "experimental",
  },
  {
    name: "TACTICAL-GRID-OS",
    description: "Lightweight dashboard for managing archive datasets, monitoring system health, and orchestrating batch jobs.",
    tech: ["NEXT.JS", "PRISMA", "NEON"],
    image: "https://api.dicebear.com/9.x/shapes/svg?seed=tactical",
    repoUrl: "https://github.com/devnation/tactical-grid",
    status: "stable",
  },
  {
    name: "CLI-TOOLKIT-CORE",
    description: "Custom terminal commands for common archival tasks, batch processing workflows, and automated reporting.",
    tech: ["NODE.JS", "TYPESCRIPT", "INK"],
    image: "https://api.dicebear.com/9.x/shapes/svg?seed=cli",
    repoUrl: "https://github.com/devnation/cli-toolkit",
    status: "archived",
  },
];
