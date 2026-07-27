"use client";

import { OrbitStage } from "@/components/home/OrbitStage";

/**
 * The full-screen loading splash: the DN logo drawing itself in, block by
 * block, behind a progress bar.
 *
 * A thin shell over the shared OrbitStage. Everything visual — the logo canvas,
 * the ring, the planets, the physics — is the stage's; this only selects the
 * "loading" presentation (progress bar visible, logo held at HERO_START_SCALE).
 * Sharing the stage rather than duplicating it is what keeps the hand-off into
 * the landing hero seamless.
 */
export function BootOverlay() {
  return <OrbitStage mode="loading" />;
}
