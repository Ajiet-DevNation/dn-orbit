// Single source of truth for role tiers + authorization predicates. No imports
// (DB-free) so the Edge runtime in proxy.ts can use it. Mirrors the Prisma
// `Role` enum in prisma/schema.prisma — keep the two in sync.

export const ROLES = [
  "president",
  "vice_president",
  "core_member",
  "member",
  // Former DevNation members who have graduated. No admin access; recognised so
  // they can be addressed and showcased distinctly. Sorts below the active
  // membership tiers but above the non-member classification.
  "alumni",
  // Non-DevNation AJIET students: no club membership, no admin access — a
  // classification tier so AJIET-only events can recognise them. Kept last so
  // it sorts below the membership tiers in role pickers.
  "ajiet_student",
] as const;

export type Role = (typeof ROLES)[number];

// The three tiers allowed into the admin panel. `member` and `ajiet_student`
// are excluded.
const ADMIN_ROLES: readonly Role[] = [
  "president",
  "vice_president",
  "core_member",
];

export const ROLE_LABELS: Record<Role, string> = {
  president: "President",
  vice_president: "Vice President",
  core_member: "Core Member",
  member: "Member",
  alumni: "AJIET Alumni",
  ajiet_student: "AJIET Student",
};

export function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" && (ROLES as readonly string[]).includes(value)
  );
}

/** May this role open the admin panel / call admin APIs? */
export function canAccessAdmin(role: string | null | undefined): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}

/** May this role change other users' role tiers? President only. */
export function canManageRoles(role: string | null | undefined): boolean {
  return role === "president";
}

// Officer tiers that sit above ordinary admins. A lower tier may not reject,
// hide or edit them — otherwise a core member could reject the President, and a
// rejected account cannot sign in (lib/auth.ts), locking them out.
const PROTECTED_RANK: Partial<Record<Role, number>> = {
  president: 0,
  vice_president: 1,
};

// may this admin change another member's status / visibility / bio?
export function canModerate(
  actorRole: string | null | undefined,
  targetRole: string | null | undefined,
): boolean {
  if (!canAccessAdmin(actorRole)) return false;
  const target = isRole(targetRole) ? PROTECTED_RANK[targetRole] : undefined;
  if (target === undefined) return true;
  const actor = isRole(actorRole) ? PROTECTED_RANK[actorRole] : undefined;
  return actor !== undefined && actor < target;
}
