export function PixelStatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-2 border-[#22c55e]/20 bg-[#22c55e]/[0.05] px-5 py-4">
      <div className="retro text-[8px] tracking-widest text-zinc-500">{label}</div>
      <div className="retro mt-2 text-2xl text-[#22c55e]">{value}</div>
    </div>
  );
}
