"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { TacticalCard } from "@/components/ui/TacticalCard";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { completeOnboarding } from "./actions";

export default function OnboardingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await completeOnboarding(formData);
        // We force a refresh to ensure the session update is picked up
        router.refresh();
      } catch (err: any) {
        if (err.message === "NEXT_REDIRECT") return;
        console.error("Submission failed:", err);
        alert("UPLINK_FAILURE: " + (err instanceof Error ? err.message : "UNKNOWN_ERROR"));
      }
    });
  }

  return (
    <main className="min-h-screen bg-black font-mono text-white selection:bg-white selection:text-black flex flex-col p-8 space-y-12">
      {/* Noise Texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[100] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* Header */}
      <header className="border-b border-zinc-900 pb-12 max-w-4xl mx-auto w-full">
        <div className="space-y-4">
          <h1 className="text-8xl font-black uppercase tracking-tighter leading-none italic group">
            INITIATE<br />UPLINK
          </h1>
          <p className="text-xs text-zinc-600 tracking-[0.4em] uppercase font-bold">
            ORBIT_CONNECTION_STAMP
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto w-full">

        {/* Left Side: Meta Info */}
        <div className="space-y-6">
          <TacticalCard status="LVL_0_UPLINK" variant="dashed" className="group">
            <div className="flex flex-col gap-4">
              <div className="w-10 h-10 border border-white/20 flex items-center justify-center bg-zinc-950">
                <span className="text-xl">!</span>
              </div>
              <p className="text-[10px] text-zinc-500 uppercase leading-relaxed tracking-widest leading-loose">
                Access to the CS_ARCHIVE requires physical and digital verification. Your data will be encrypted using the THF PROTOCOL X-94.
              </p>
            </div>
          </TacticalCard>

          <div className="space-y-4 pt-12 overflow-hidden">
            <div className="bg-white text-black px-4 py-2 font-black italic tracking-tighter text-xl inline-block -rotate-6 border-2 border-black translate-x-2">
              VERIFIED
            </div>
            <div className="bg-transparent text-white px-4 py-2 font-black uppercase tracking-widest text-lg border-2 border-white/20 inline-block rotate-3 -translate-x-2">
              CONFIDENTIAL
            </div>
          </div>

          <div className="pt-12">
            <span className="text-[8px] text-zinc-800 uppercase tracking-[0.4em] font-bold">SAFELY_WORK_ON_ARCHIVE v0.2.1</span>
          </div>
        </div>

        {/* Center/Right Form: The Action Area */}
        <div className="md:col-span-2">
          <form action={handleSubmit} className="space-y-12">

            <div className="space-y-8">
              <div className="text-xl font-black uppercase tracking-tighter border-b border-zinc-900 pb-2">
                01_IDENTIFICATION
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-focus-within:text-white transition-colors">
                    Full Name (Codename)
                  </label>
                  <input
                    name="name"
                    required
                    placeholder="E.G. ABOOBAKAR TWAHA"
                    className="w-full bg-transparent border border-zinc-800 py-3 px-4 text-xs font-bold uppercase tracking-widest placeholder:text-zinc-800 focus:outline-none focus:border-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-focus-within:text-white transition-colors">
                      USN
                    </label>
                    <input
                      name="usn"
                      required
                      placeholder="E.G. 4JKXXXXXXX"
                      className="w-full bg-transparent border border-zinc-800 py-3 px-4 text-xs font-bold uppercase tracking-widest placeholder:text-zinc-800 focus:outline-none focus:border-white transition-all"
                    />
                  </div>
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-focus-within:text-white transition-colors">
                      Branch
                    </label>
                    <input
                      name="branch"
                      required
                      placeholder="E.G. CSE"
                      className="w-full bg-transparent border border-zinc-800 py-3 px-4 text-xs font-bold uppercase tracking-widest placeholder:text-zinc-800 focus:outline-none focus:border-white transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="text-xl font-black uppercase tracking-tighter border-b border-zinc-900 pb-2">
                02_CLEARANCE_ACCESS
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-focus-within:text-white transition-colors">
                    Academic Year (1-4)
                  </label>
                  <input
                    name="year"
                    type="number"
                    min={1}
                    max={4}
                    required
                    placeholder="LVL"
                    className="w-full bg-transparent border border-zinc-800 py-3 px-4 text-xs font-bold uppercase tracking-widest placeholder:text-zinc-800 focus:outline-none focus:border-white transition-all"
                  />
                </div>
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-focus-within:text-white transition-colors">
                    LeetCode Username (Optional)
                  </label>
                  <input
                    name="lcUsername"
                    placeholder="E.G. SUNPREETH"
                    className="w-full bg-transparent border border-zinc-800 py-3 px-4 text-xs font-bold uppercase tracking-widest placeholder:text-zinc-800 focus:outline-none focus:border-white transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="pt-12 space-y-6">
              <TacticalButton
                type="submit"
                disabled={isPending}
                size="lg"
                className="w-full py-6 transition-all"
              >
                {isPending ? "UPLINKING_DATA..." : "COMMIT UPLINK"}
              </TacticalButton>
              <p className="text-[8px] text-zinc-600 text-center uppercase tracking-widest">
                WARNING: UNAUTHORIZED ACCESS ATTEMPTS ARE LOGGED AND REPORTED.
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}