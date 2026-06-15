import type { NavLink } from "@/types";

/* ── Navigation Routes ── */

export const NAV_LINKS: NavLink[] = [
  { label: "EVENTS", href: "/events" },
  { label: "LEADERBOARD", href: "/leaderboard" },
  { label: "PROJECTS", href: "/projects" },
  { label: "MEMBERS", href: "/members" },
];

/* ── Branding ── */

export const SITE_NAME = "CS_ARCHIVE_V1.0";
export const SITE_DESCRIPTION =
  "Terminal interface for the DevNation collective. Access encrypted project logs, member databases, and upcoming tactical events.";

/* ── Footer Links ── */

export const FOOTER_LINKS = [
  "DATA_PRIVACY",
  "STAMP_VERIFIED",
  "ENCRYPTED_LINE",
];

/* ── Stamp Label Presets ── */

export const STAMP_PRESETS = {
  verified: "VERIFIED",
  confidential: "CONFIDENTIAL",
  urgent: "URGENT_FILE",
  restricted: "RESTRICTED",
  archived: "ARCHIVED",
} as const;
