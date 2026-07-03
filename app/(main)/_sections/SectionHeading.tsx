import { cn } from "@/lib/utils";
import { PixelReveal } from "./PixelReveal";

// Section title with the same 8-bit pixel-block reveal as the rest of the page:
// the title and its accent underline dissolve in, block by block, when scrolled
// into view — consistent with the event cards and the loading-logo draw-in.
interface SectionHeadingProps {
  text: string;
  className?: string;
}

export function SectionHeading({ text, className }: SectionHeadingProps) {
  return (
    <PixelReveal className="mx-auto mb-12 flex w-fit flex-col items-center gap-4">
      <h2
        className={cn(
          "retro text-center text-xl tracking-wider text-white",
          className,
        )}
      >
        {text}
      </h2>
      <span aria-hidden="true" className="block h-[3px] w-24 bg-[#22c55e]" />
    </PixelReveal>
  );
}
