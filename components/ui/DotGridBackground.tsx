/**
 * DotGridBackground — Fixed full-viewport dot-grid texture overlay.
 * Placed once in the root layout. pointer-events-none so it never
 * blocks interaction with actual content underneath.
 */
export function DotGridBackground() {
  return (
    <div
      className="dot-grid-bg pointer-events-none fixed inset-0 z-0 opacity-40"
      aria-hidden="true"
    />
  );
}
