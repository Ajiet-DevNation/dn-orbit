import Image from "next/image";

export function SidebarBrand() {
  return (
    <div className="border-b-2 border-white/10 p-8">
      <div className="flex items-center gap-4">
        <div className="relative h-12 w-16 shrink-0 overflow-hidden border-2 border-white/15 bg-[#0a0a0a]">
          <Image
            src="/assets/DNLogoTransparent.png"
            alt="DevNation logo"
            fill
            sizes="64px"
            className="object-contain pixelated"
            priority
          />
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="retro text-sm leading-none text-white">ORBIT</span>
          <span className="retro text-[8px] tracking-widest text-[#22c55e]/70">
            ADMIN
          </span>
        </div>
      </div>
    </div>
  );
}
