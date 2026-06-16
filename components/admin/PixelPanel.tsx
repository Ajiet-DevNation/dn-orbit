import { cn } from "@/lib/utils";

export function PixelPanel({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-2 border-white/10 bg-black/60", className)}>
      {title && (
        <header className="retro border-b-2 border-white/10 px-5 py-3 text-[9px] tracking-widest text-[#22c55e]">
          {title}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
