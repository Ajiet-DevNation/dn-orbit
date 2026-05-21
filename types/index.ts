/* ── ORBIT Shared Types ── */

export type StampVariant =
  | "verified"
  | "confidential"
  | "urgent"
  | "restricted"
  | "archived";

export type BadgeVariant =
  | "stable"
  | "experimental"
  | "archived"
  | "restricted"
  | "urgent";

export type ButtonVariant = "filled" | "outlined";

export interface RepoData {
  name: string;
  description: string;
  stars: number;
  forks: number;
  status: BadgeVariant;
}

export interface NavLink {
  label: string;
  href: string;
}
