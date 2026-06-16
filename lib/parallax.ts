// Pure, DOM-free parallax math so it can be unit-tested with `bun test` and
// reused by the rAF hook. Returns a signed progress value:
//   -1  element just entering from the bottom of the viewport
//    0  element centre aligned with viewport centre
//   +1  element just leaving past the top
// Travel range = (viewportHeight + rectHeight) / 2 so 0 is exactly centre.

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

export function viewportProgress(
  rectTop: number,
  rectHeight: number,
  viewportHeight: number
): number {
  const range = (viewportHeight + rectHeight) / 2;
  if (range <= 0) return 0;
  const elementCentre = rectTop + rectHeight / 2;
  const viewportCentre = viewportHeight / 2;
  return clamp((viewportCentre - elementCentre) / range, -1, 1);
}
