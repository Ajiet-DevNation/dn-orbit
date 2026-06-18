export function PixelStatTile({ label, value }: { label: string; value: string | number }) {
  return (
    // Softer, landing-consistent stat: neutral frame + white value, with green
    // reserved as a small left-accent rather than flooding the whole tile.
    <div className="border-2 border-white/10 border-l-[6px] border-l-[#22c55e]/60 bg-white/[0.02] px-5 py-4">
      <div className="retro text-[8px] tracking-widest text-zinc-500">{label}</div>
      <div className="retro mt-2 text-2xl text-white">{value}</div>
    </div>
  );
}
