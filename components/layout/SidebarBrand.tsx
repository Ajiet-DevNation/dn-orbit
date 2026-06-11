import Image from "next/image";

export function SidebarBrand({
  sectorLabel,
}: {
  sectorLabel: string;
}) {
  return (
    <div className="p-8 border-b border-zinc-900">
      <div className="flex items-center gap-4">
        <div className="relative h-12 w-16 shrink-0 overflow-hidden border border-zinc-800 bg-zinc-950">
          <Image
            src="/assets/DevNationLogoFinale.png"
            alt="DevNation logo"
            fill
            sizes="64px"
            className="object-contain"
            priority
          />
        </div>

        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-black tracking-tighter leading-none">
            ORBIT
          </span>
          <span className="text-[9px] text-zinc-600 font-bold tracking-widest">
            {sectorLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
