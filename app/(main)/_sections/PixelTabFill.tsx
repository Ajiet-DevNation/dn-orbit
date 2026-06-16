// Green selection fill for the nav tabs, drawn in as scattered pixel blocks
// (matching the loading-screen logo) rather than a sliding bar. The cells react
// to the parent TabsTrigger's `data-state="active"` purely via CSS (see the
// `.pixel-tab-cell` rules in globals.css); per-cell delays are deterministic
// (no Math.random) and rounded to whole milliseconds, so the server-rendered
// value survives the browser's CSSOM precision rounding and hydration matches.

const COLS = 18;
const ROWS = 4;
const CELL_COUNT = COLS * ROWS;
const SPREAD_MS = 170;

function pseudoRandom(i: number): number {
  const r = Math.sin((i + 1) * 12.9898) * 43758.5453;
  return r - Math.floor(r);
}

export function PixelTabFill() {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 grid"
      style={{
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gridTemplateRows: `repeat(${ROWS}, 1fr)`,
      }}
    >
      {Array.from({ length: CELL_COUNT }, (_, i) => (
        <span
          key={i}
          className="pixel-tab-cell"
          style={{ transitionDelay: `${Math.round(pseudoRandom(i) * SPREAD_MS)}ms` }}
        />
      ))}
    </span>
  );
}
