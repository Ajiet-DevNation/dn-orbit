import Link from "next/link";
import { Button } from "@/components/ui/8bit-button";

// 404. Previously fell through to Next's unstyled default, which on this site
// reads as a broken deploy rather than a missing page.
export default function NotFound() {
  return (
    <main className="retro dark flex min-h-screen flex-col items-center justify-center gap-7 bg-[#0a0a0a] px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <p className="retro text-4xl text-[#22c55e] sm:text-6xl">404</p>
        <h1 className="retro text-base text-white sm:text-xl">LOST IN ORBIT</h1>
        <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground sm:text-sm">
          That page isn&apos;t here. It may have been moved, or the link may be
          out of date.
        </p>
      </div>

      <Button asChild className="text-[10px]">
        <Link href="/">BACK TO ORBIT</Link>
      </Button>
    </main>
  );
}
