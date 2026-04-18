/* ── Terminal Mock Data ── */

export interface TerminalMember {
  name: string;
  role: string;
  handle: string;
  status: "active" | "idle" | "offline";
}

export interface TerminalProject {
  name: string;
  description: string;
  tech: string[];
  status: "stable" | "experimental" | "archived";
}

export const TERMINAL_MEMBERS: TerminalMember[] = [
  {
    name: "ELIAS VANCE",
    role: "SYSTEM_ARCHITECT",
    handle: "@EV0_A2",
    status: "active",
  },
  {
    name: "SARAH KOVACS",
    role: "ML_ENGINEER",
    handle: "@S_KOVACS",
    status: "active",
  },
  {
    name: "MARCUS WEBB",
    role: "DATA_ANALYST",
    handle: "@M_WEBB",
    status: "idle",
  },
  {
    name: "NOVA CHEN",
    role: "FRONTEND_DEV",
    handle: "@NOVA_C",
    status: "active",
  },
  {
    name: "RAJ PATEL",
    role: "BACKEND_DEV",
    handle: "@RAJ_P",
    status: "offline",
  },
  {
    name: "LUNA FROST",
    role: "SECURITY_OPS",
    handle: "@L_FROST",
    status: "active",
  },
];

export const TERMINAL_PROJECTS: TerminalProject[] = [
  {
    name: "NEURAL_VAULT",
    description: "Encrypted neural network model storage with access-controlled inference pipelines",
    tech: ["PYTHON", "TENSORFLOW", "DOCKER"],
    status: "stable",
  },
  {
    name: "GHOST_ENCRYPT",
    description: "End-to-end encrypted messaging protocol with zero-knowledge proof authentication",
    tech: ["RUST", "WASM", "WEBRTC"],
    status: "experimental",
  },
  {
    name: "TACTICAL-GRID-OS",
    description: "Lightweight dashboard for managing archive datasets and monitoring system health",
    tech: ["NEXT.JS", "PRISMA", "NEON"],
    status: "stable",
  },
  {
    name: "CLI-TOOLKIT-CORE",
    description: "Custom terminal commands for common archival tasks and batch processing workflows",
    tech: ["NODE.JS", "TYPESCRIPT", "INK"],
    status: "archived",
  },
];
