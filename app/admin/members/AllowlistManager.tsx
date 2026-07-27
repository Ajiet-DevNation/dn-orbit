"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PixelPanel } from "@/components/admin/PixelPanel";
import { Button } from "@/components/ui/8bit-button";
import { Input } from "@/components/ui/8bit-input";
import { toast } from "@/components/ui/8bit-toast";

interface AllowlistEntry {
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
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function AllowlistManager({ initialEntries }: AllowlistManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [githubUsername, setGithubUsername] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  const handleAdd = async () => {
    if (!githubUsername.trim() && !email.trim()) {
      toast.error("Provide a GitHub username or email");
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
        toast.success("Added to allowlist");
      } catch (err) {
        toast.error(
          `Failed: ${err instanceof Error ? err.message : "UNKNOWN"}`,
        );
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
        toast.success("Removed from allowlist");
      } catch (err) {
        toast.error(
          `Failed: ${err instanceof Error ? err.message : "UNKNOWN"}`,
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      <PixelPanel title="ALLOWLIST">
        <div className="space-y-6">
          <p className="retro text-[9px] text-zinc-500 uppercase tracking-[0.2em] leading-relaxed max-w-2xl">
            Only GitHub accounts whose username or email appears below may sign
            in. The public can browse without an account.
          </p>

          {/* Add form — grid so the 8-bit inputs each get an equal track and
              shrink (min-w-0) instead of overflowing; the button takes an auto
              column. Cells stretch to the row height so the button can bottom-
              anchor and match the inputs' height exactly. */}
          <div className="grid grid-cols-1 gap-4 border-2 border-dashed border-white/20 p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-stretch [&>*]:min-w-0">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="allowlist-github-username"
                className="retro text-[8px] text-zinc-600 uppercase tracking-widest"
              >
                GITHUB USERNAME
              </label>
              <Input
                id="allowlist-github-username"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                placeholder="octocat"
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="allowlist-email"
                className="retro text-[8px] text-zinc-600 uppercase tracking-widest"
              >
                EMAIL (OPTIONAL)
              </label>
              <Input
                id="allowlist-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="member@ajiet.edu.in"
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="allowlist-note"
                className="retro text-[8px] text-zinc-600 uppercase tracking-widest"
              >
                NOTE (OPTIONAL)
              </label>
              <Input
                id="allowlist-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="3rd yr CSE"
                disabled={isPending}
              />
            </div>
            {/* 8-bit button, bottom-anchored. Its layout box is h-9 (36px) and
                the pixel-border decorations extend 6px above & below → 48px
                visual, the same as an input frame. mb-1.5 lifts the box 6px so
                that 48px visual aligns flush with the input boxes' edges. */}
            <div className="flex flex-col justify-end">
              <Button
                type="button"
                onClick={handleAdd}
                disabled={isPending}
                className="mb-1.5 text-[9px] !bg-[#22c55e] !text-black hover:!bg-[#16a34a]"
              >
                {isPending ? "…" : "GRANT ACCESS"}
              </Button>
            </div>
          </div>

          {/* Entry list */}
          <div className="border-2 border-white/10">
            <div className="grid grid-cols-[1.2fr_1.5fr_1fr_auto] gap-4 border-b-2 border-white/10 bg-zinc-950/50 px-4 py-2">
              <span className="retro text-[8px] uppercase tracking-widest text-zinc-600">
                GitHub
              </span>
              <span className="retro text-[8px] uppercase tracking-widest text-zinc-600">
                Email
              </span>
              <span className="retro text-[8px] uppercase tracking-widest text-zinc-600">
                Added
              </span>
              <span className="retro text-[8px] uppercase tracking-widest text-zinc-600 text-right">
                Action
              </span>
            </div>

            {initialEntries.length === 0 ? (
              <div className="px-4 py-6 text-center retro text-[10px] text-zinc-700 uppercase tracking-widest">
                No entries yet · only env-bootstrap admins can sign in
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
