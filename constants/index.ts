import type { NavLink } from "@/types";

/* ── Navigation Routes ── */

export const NAV_LINKS: NavLink[] = [
  { label: "REPOSITORIES", href: "/repositories" },
  { label: "LOGS", href: "/logs" },
  { label: "MEMBERS", href: "/members" },
  { label: "TERMINAL", href: "/terminal" },
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
