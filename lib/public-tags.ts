import { revalidateTag } from "next/cache";

// Cache tags for the landing page's public data (lib/public-data.ts). Kept in
// a module with no app imports so writers anywhere — lib/leaderboard included —
// can invalidate without an import cycle.

export const PUBLIC_TAG = {
  events: "public:events",
  leaderboard: "public:leaderboard",
  projects: "public:projects",
  recruitment: "public:recruitment",
} as const;
export type PublicTag = (typeof PUBLIC_TAG)[keyof typeof PUBLIC_TAG];

/** Drop cached public data now, so the next visitor reads fresh. Outside a
 *  request scope (scripts) there is nothing cached to drop, so it's a no-op. */
export function invalidatePublic(...tags: PublicTag[]): void {
  for (const tag of tags) {
    try {
      revalidateTag(tag, { expire: 0 });
    } catch {
      // Not in a request (e.g. a seed script).
    }
  }
}
