"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  type PixelColumn,
  PixelDataTable,
} from "@/components/admin/PixelDataTable";
import { PixelPanel } from "@/components/admin/PixelPanel";
import { Button } from "@/components/ui/8bit-button";
import { Input } from "@/components/ui/8bit-input";
import { toast } from "@/components/ui/8bit-toast";
import { useConfirm } from "@/components/ui/PixelConfirm";

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
  const { confirm, dialog } = useConfirm();
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
          `Failed: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    });
  };

  // Revoking removes someone's ability to sign in at all, so it confirms first
  // — the same treatment the events and projects tables give their deletes. It
  // previously fired straight from the click.
  const handleRemove = async (entry: AllowlistEntry) => {
    const who = entry.githubUsername ?? entry.email ?? "this entry";
    const ok = await confirm({
      title: "REVOKE ACCESS",
      message: `Revoke sign-in access for ${who}? They will be locked out until re-added.`,
      confirmLabel: "REVOKE",
    });
    if (!ok) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/allowlist/${entry.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(await res.text());
        router.refresh();
        toast.success("Removed from allowlist");
      } catch (err) {
        toast.error(
          `Failed: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    });
  };

  // Rendered through the shared PixelDataTable like every other admin list.
  // The bespoke CSS grid this replaces had no horizontal scroll, so on a phone
  // the columns simply crushed into each other.
  const columns: PixelColumn<AllowlistEntry>[] = [
    {
      key: "github",
      header: "GITHUB",
      render: (e) => (
        <span className="retro text-[11px] text-white">
          {e.githubUsername ?? "—"}
        </span>
      ),
    },
    {
      key: "email",
      header: "EMAIL",
      render: (e) => (
        <span className="text-[11px] text-zinc-500">{e.email ?? "—"}</span>
      ),
    },
    {
      key: "note",
      header: "NOTE",
      render: (e) => (
        <span className="text-[11px] text-zinc-500">{e.note || "—"}</span>
      ),
    },
    {
      key: "added",
      header: "ADDED",
      render: (e) => (
        <span className="retro text-[9px] whitespace-nowrap text-zinc-600">
          {formatStamp(e.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "ACTIONS",
      align: "right",
      render: (e) => (
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleRemove(e)}
          className="retro border-2 border-red-500/40 px-3 py-1 text-[8px] text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
        >
          REVOKE
        </button>
      ),
    },
  ];

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

          <PixelDataTable
            data={initialEntries}
            columns={columns}
            empty="NO ENTRIES YET · ONLY ENV-BOOTSTRAP ADMINS CAN SIGN IN"
          />
        </div>
      </PixelPanel>
      {dialog}
    </div>
  );
}
