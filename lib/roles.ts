// Single source of truth for role tiers + authorization predicates. No imports
// (DB-free) so the Edge runtime in proxy.ts can use it. Mirrors the Prisma
// `Role` enum in prisma/schema.prisma — keep the two in sync.

export const ROLES = [
  "president",
  "vice_president",
  "core_member",
  "member",
] as const;

export type Role = (typeof ROLES)[number];

// The three tiers allowed into the admin panel. `member` is excluded.
export const ADMIN_ROLES: readonly Role[] = [
  "president",
  "vice_president",
  "core_member",
];

export const ROLE_LABELS: Record<Role, string> = {
  president: "President",
  vice_president: "Vice President",
  core_member: "Core Member",
  member: "Member",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** May this role open the admin panel / call admin APIs? */
export function canAccessAdmin(role: string | null | undefined): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}

/** May this role change other users' role tiers? President only. */
export function canManageRoles(role: string | null | undefined): boolean {
  return role === "president";
}
