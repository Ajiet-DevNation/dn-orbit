// Pure mapping from glide direction to GSAP x endpoints (px). As the section
// scrolls from entering (bottom) to leaving (top), x travels fromX -> toX,
// passing through 0 mid-viewport. direction -1 nets leftward (Projects);
// +1 nets rightward (Members).
export function glideEndpoints(
  direction: -1 | 1,
  distancePx: number
): { fromX: number; toX: number } {
  const d = Math.sign(direction) || 1;
  return { fromX: -d * distancePx, toX: d * distancePx };
}
