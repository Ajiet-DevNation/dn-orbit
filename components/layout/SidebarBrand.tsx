import Image from "next/image";

export function SidebarBrand({
  sectorLabel,
}: {
  sectorLabel: string;
}) {
  return (
    <div className="p-8 border-b-2 border-white/10">
      <div className="flex items-center gap-4">
        <div className="relative h-12 w-16 shrink-0 overflow-hidden border-2 border-[#22c55e]/30 bg-[#0a0a0a]">
          <Image
            src="/assets/DevNationLogoFinale.png"
            alt="DevNation logo"
            fill
            sizes="64px"
            className="object-contain pixelated"
            priority
          />
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="retro text-xs text-[#22c55e] leading-none">
            ORBIT
          </span>
          <span className="retro text-[7px] text-zinc-600 tracking-widest">
            {sectorLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
