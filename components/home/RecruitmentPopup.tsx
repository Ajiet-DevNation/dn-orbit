"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PlutonStage } from "@/components/home/PlutonStage";
import { Button } from "@/components/ui/8bit-button";
import { PixelModal } from "@/components/ui/PixelModal";
import { onBootSplashDone } from "@/lib/boot-splash";

// "We're hiring" popup with Pluton. The landing page renders this only while
// an admin has recruitment switched on (same flag as RecruitmentBanner).
// Shown once per browser session, after the boot splash has lifted.

const SEEN_KEY = "dn-recruit-popup-seen";
const OPEN_DELAY_MS = 700; // a beat after the splash, so it doesn't feel ambushy

const FEATURES = [
  { icon: "/assets/pluton/icon-code.png", label: "REAL-WORLD PROJECTS" },
  { icon: "/assets/pluton/icon-learn.png", label: "LEARN & EXPERIMENT" },
  { icon: "/assets/pluton/icon-team.png", label: "GROW TOGETHER" },
];

// Storage can throw (private mode, blocked site data). Failing open only means
// the popup may show again — never that the page breaks.
function wasSeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {}
}

export function RecruitmentPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (wasSeen()) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = onBootSplashDone(() => {
      timer = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
    });
    return () => {
      stop();
      if (timer) clearTimeout(timer);
    };
  }, []);

  const close = (next: boolean) => {
    if (next) return;
    markSeen();
    setOpen(false);
  };

  return (
    <PixelModal
      open={open}
      onOpenChange={close}
      size="xl"
      tone="violet"
      title={
        <span className="flex items-center gap-4">
          <span aria-hidden className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ef4444]" />
            <span className="size-2.5 rounded-full bg-[#eab308]" />
            <span className="size-2.5 rounded-full bg-[#22c55e]" />
          </span>
          <span className="text-[10px] md:text-xs">
            <span className="text-[#22c55e]">DEVNATION</span>
            <span className="text-white/60">{" // RECRUITMENT"}</span>
          </span>
        </span>
      }
    >
      <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[1.15fr_1fr] md:gap-8">
        <div className="order-2 flex flex-col gap-6 md:order-1">
          <h3 className="retro leading-tight">
            <span className="block text-2xl text-white sm:text-3xl md:text-4xl">
              WE ARE
            </span>
            <span className="mt-2 block text-3xl text-[#22c55e] [text-shadow:0_0_18px_rgba(34,197,94,0.45)] sm:text-4xl md:text-5xl">
              HIRING!
            </span>
          </h3>
          <p className="font-mono text-sm leading-relaxed text-white/80">
            Curious minds wanted. Join us to build, learn, experiment, and
            create things that matter.
          </p>

          <ul className="grid grid-cols-3 divide-x-2 divide-white/10">
            {FEATURES.map((f) => (
              <li
                key={f.label}
                className="flex flex-col items-center gap-2 px-2 text-center"
              >
                <Image
                  src={f.icon}
                  alt=""
                  width={32}
                  height={32}
                  className="pixelated size-8"
                />
                <span className="retro text-[7px] leading-relaxed text-white/80 sm:text-[8px]">
                  {f.label}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              className="text-[10px] !bg-[#22c55e] hover:!bg-[#16a34a] !text-black sm:px-6"
            >
              <Link href="/recruitments" onClick={markSeen}>
                JOIN THE CREW ▸
              </Link>
            </Button>
            <button
              type="button"
              onClick={() => close(false)}
              className="retro border-4 border-[#22c55e] px-5 py-2 text-[10px] text-[#22c55e] transition-colors hover:bg-[#22c55e]/10"
            >
              EXPLORE DEVNATION
            </button>
          </div>
        </div>

        <div className="order-1 mx-auto w-full max-w-[220px] md:order-2 md:max-w-[380px]">
          <PlutonStage />
        </div>
      </div>
    </PixelModal>
  );
}
