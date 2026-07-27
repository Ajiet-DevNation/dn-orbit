"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/8bit-button";

// Route-level error boundary.
//
// Without this, an uncaught throw in any client component replaced the whole
// page with Next's default error screen (or, in production, a blank white page)
// — an unstyled dead end with no way back. This keeps the visitor inside the
// 8-bit shell and gives them a retry.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only handle on the server-side stack in production
    // logs, so surface it rather than swallowing the error silently.
    console.error("[error-boundary]", error.digest ?? "", error);
  }, [error]);

  return (
    <main className="retro dark flex min-h-screen flex-col items-center justify-center gap-7 bg-[#0a0a0a] px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <p className="retro text-xs tracking-widest text-red-400">
          SYSTEM FAULT
        </p>
        <h1 className="retro text-lg text-white sm:text-2xl">
          SOMETHING BROKE
        </h1>
        <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground sm:text-sm">
          An unexpected error stopped this page from rendering. Retrying usually
          clears it; if it keeps happening, let the maintainers know.
        </p>
        {error.digest && (
          <code className="retro text-[8px] tracking-widest text-muted-foreground/60">
            REF {error.digest}
          </code>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Button onClick={reset} className="text-[10px]">
          TRY AGAIN
        </Button>
        <Button asChild variant="outline" className="text-[10px]">
          <a href="/">BACK TO ORBIT</a>
        </Button>
      </div>
    </main>
  );
}
