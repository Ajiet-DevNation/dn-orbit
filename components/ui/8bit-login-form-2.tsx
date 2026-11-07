import Link from "next/link";
import { BrandLink } from "@/components/layout/BrandLink";
import { Button } from "@/components/ui/8bit-button";
import { PixelFrame } from "@/components/ui/PixelFrame";
import { PixelArrow, PixelCross } from "@/components/ui/PixelIcons";
import { signIn } from "@/lib/auth";

// Members-only GitHub sign-in, in the same purple pixel frame as the
// recruitment cards so the auth screen reads as part of ORBIT.
function LoginForm({ errorMessage }: { errorMessage?: string | null }) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/"
        className="retro flex w-fit items-center gap-2 text-[9px] text-brand-light transition-colors duration-200 hover:text-white"
      >
        <PixelArrow dir="left" /> BACK TO ORBIT
      </Link>
      <PixelFrame>
        <div className="flex flex-col items-center gap-5 px-2 py-4 text-center sm:px-4">
          <BrandLink
            imageClassName="size-14"
            wordmarkClassName="text-xl mt-1"
          />
          <div className="flex flex-col gap-2">
            <h1 className="retro text-base text-white sm:text-lg">SIGN IN</h1>
            <p className="font-mono text-sm leading-relaxed text-[#d4d0ea]">
              Members only. Use the GitHub account the club added.
            </p>
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="retro flex w-full items-start gap-2.5 border-2 border-[#ef4444]/70 bg-[#ef4444]/10 px-4 py-3 text-left text-[9px] leading-relaxed text-[#f87171]"
            >
              <PixelCross className="mt-0.5 shrink-0 text-sm" />
              {errorMessage}
            </p>
          )}

          <form
            className="w-full"
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/" });
            }}
          >
            <Button
              type="submit"
              className="h-auto w-full whitespace-normal py-3 text-[10px] leading-tight !bg-brand !text-black hover:!bg-brand-light"
            >
              <svg
                className="mr-1 size-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              SIGN IN WITH GITHUB
            </Button>
          </form>

          <p className="font-mono text-xs leading-relaxed text-muted-foreground">
            Not a member yet? Watch the home page for the next recruitment
            drive.
          </p>
        </div>
      </PixelFrame>
    </div>
  );
}

export default LoginForm;
