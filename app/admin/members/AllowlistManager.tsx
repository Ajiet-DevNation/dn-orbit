"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/8bit-toast";
import { PixelPanel } from "@/components/admin/PixelPanel";

export interface AllowlistEntry {
  id: string;
  githubUsername: string | null;
  email: string | null;
  note: string | null;
  createdAt: string; // ISO
}

interface AllowlistManagerProps {
  initialEntries: AllowlistEntry[];
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function AllowlistManager({ initialEntries }: AllowlistManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [githubUsername, setGithubUsername] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  const inputClass =
    "retro bg-black border-2 border-white/10 focus:border-[#22c55e] outline-none px-3 py-2 text-[11px] text-white placeholder:text-zinc-700 tracking-wider transition-colors w-full";

  const handleAdd = async () => {
    if (!githubUsername.trim() && !email.trim()) {
      toast.error("PROVIDE_A_GITHUB_USERNAME_OR_EMAIL");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/allowlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ githubUsername, email, note }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);

        setGithubUsername("");
        setEmail("");
        setNote("");
        router.refresh();
        toast.success("ACCESS_GRANTED: ENTRY_ADDED_TO_ALLOWLIST");
      } catch (err) {
        toast.error("ADD_FAILED: " + (err instanceof Error ? err.message : "UNKNOWN"));
      }
    });
  };

  const handleRemove = async (id: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/allowlist/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(await res.text());
        router.refresh();
        toast.success("ACCESS_REVOKED: ENTRY_REMOVED_FROM_ALLOWLIST");
      } catch (err) {
        toast.error("REMOVE_FAILED: " + (err instanceof Error ? err.message : "UNKNOWN"));
      }
    });
  };

  return (
    <div className="space-y-6">
      <PixelPanel title="ACCESS_ALLOWLIST">
        <div className="space-y-6">
          <p className="retro text-[9px] text-zinc-500 uppercase tracking-[0.2em] leading-relaxed max-w-2xl">
            Only GitHub accounts whose username or email appears below (or in the ADMIN_GITHUB_USERNAMES env) may sign in. The public can browse without an account.
          </p>

          {/* Add form */}
          <div className="flex flex-col gap-3 border-2 border-dashed border-white/20 p-4 md:flex-row md:items-end">
            <div className="flex flex-1 flex-col gap-1">
              <label className="retro text-[8px] text-zinc-600 uppercase tracking-widest">
                GitHub_Username
              </label>
              <input
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                placeholder="octocat"
                className={inputClass}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="retro text-[8px] text-zinc-600 uppercase tracking-widest">
                Email_(optional)
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="member@ajiet.edu.in"
                className={inputClass}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="retro text-[8px] text-zinc-600 uppercase tracking-widest">
                Note_(optional)
              </label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="3rd yr CSE"
                className={inputClass}
                disabled={isPending}
              />
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={isPending}
              className="retro border-2 border-[#22c55e] px-4 py-2 text-[9px] text-[#22c55e] transition-colors hover:bg-[#22c55e] hover:text-black disabled:opacity-50 md:self-stretch"
            >
              {isPending ? "..." : "GRANT_ACCESS"}
            </button>
          </div>

          {/* Entry list */}
          <div className="border-2 border-white/10">
            <div className="grid grid-cols-[1.2fr_1.5fr_1fr_auto] gap-4 border-b-2 border-white/10 bg-zinc-950/50 px-4 py-2">
              <span className="retro text-[8px] uppercase tracking-widest text-zinc-600">GitHub</span>
              <span className="retro text-[8px] uppercase tracking-widest text-zinc-600">Email</span>
              <span className="retro text-[8px] uppercase tracking-widest text-zinc-600">Added</span>
              <span className="retro text-[8px] uppercase tracking-widest text-zinc-600 text-right">Action</span>
            </div>

            {initialEntries.length === 0 ? (
              <div className="px-4 py-6 text-center retro text-[10px] text-zinc-700 uppercase tracking-widest">
                NO_ENTRIES — ONLY ENV-BOOTSTRAP ADMINS CAN SIGN IN
              </div>
            ) : (
              initialEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-[1.2fr_1.5fr_1fr_auto] items-center gap-4 border-b-2 border-white/10 px-4 py-3 last:border-b-0"
                >
                  <span className="retro truncate text-[11px] text-white">
                    {entry.githubUsername ?? "—"}
                  </span>
                  <span className="truncate text-[11px] text-zinc-500">
                    {entry.email ?? "—"}
                  </span>
                  <span className="retro text-[9px] text-zinc-600 tracking-tighter">
                    {formatStamp(entry.createdAt)}
                  </span>
                  <div className="text-right">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRemove(entry.id)}
                      className="retro border-2 border-red-500/40 px-3 py-1 text-[8px] text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                    >
                      REVOKE
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </PixelPanel>
    </div>
  );
}
