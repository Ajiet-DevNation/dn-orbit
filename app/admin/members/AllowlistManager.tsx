"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { TacticalFeedback } from "@/components/ui/TacticalFeedback";

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
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const inputClass =
    "bg-black border border-white/10 focus:border-white outline-none px-3 py-2 text-[11px] font-mono text-white placeholder:text-zinc-700 tracking-wider transition-colors";

  const handleAdd = async () => {
    if (!githubUsername.trim() && !email.trim()) {
      setFeedback({
        message: "PROVIDE_A_GITHUB_USERNAME_OR_EMAIL",
        type: "error",
      });
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
        setFeedback({
          message: "ACCESS_GRANTED: ENTRY_ADDED_TO_ALLOWLIST",
          type: "success",
        });
      } catch (err) {
        setFeedback({
          message:
            "ADD_FAILED: " + (err instanceof Error ? err.message : "UNKNOWN"),
          type: "error",
        });
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
        setFeedback({
          message: "ACCESS_REVOKED: ENTRY_REMOVED_FROM_ALLOWLIST",
          type: "success",
        });
      } catch (err) {
        setFeedback({
          message:
            "REMOVE_FAILED: " + (err instanceof Error ? err.message : "UNKNOWN"),
          type: "error",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="text-xl font-black uppercase tracking-tighter">
          ACCESS_ALLOWLIST
        </div>
        <div className="text-[8px] text-zinc-800 uppercase tracking-widest font-bold">
          SIGN_IN_GATE
        </div>
      </div>

      <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-bold leading-relaxed max-w-2xl">
        Only GitHub accounts whose username or email appears below (or in the
        ADMIN_GITHUB_USERNAMES env) may sign in. The public can browse without an
        account.
      </p>

      {/* Add form */}
      <div className="flex flex-col gap-3 border border-dashed border-white/20 p-4 md:flex-row md:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-[8px] text-zinc-600 uppercase tracking-widest font-black">
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
          <label className="text-[8px] text-zinc-600 uppercase tracking-widest font-black">
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
          <label className="text-[8px] text-zinc-600 uppercase tracking-widest font-black">
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
        <TacticalButton
          variant="primary"
          onClick={handleAdd}
          disabled={isPending}
          className="font-black md:self-stretch"
        >
          {isPending ? "..." : "GRANT_ACCESS"}
        </TacticalButton>
      </div>

      {/* Entry list */}
      <div className="border border-white/10">
        <div className="grid grid-cols-[1.2fr_1.5fr_1fr_auto] gap-4 border-b border-white/10 bg-zinc-950/50 px-4 py-2 text-[8px] uppercase tracking-widest text-zinc-600 font-black">
          <span>GitHub</span>
          <span>Email</span>
          <span>Added</span>
          <span className="text-right">Action</span>
        </div>

        {initialEntries.length === 0 ? (
          <div className="px-4 py-6 text-center text-[10px] text-zinc-700 uppercase tracking-widest font-bold">
            NO_ENTRIES — ONLY ENV-BOOTSTRAP ADMINS CAN SIGN IN
          </div>
        ) : (
          initialEntries.map((entry) => (
            <div
              key={entry.id}
              className="grid grid-cols-[1.2fr_1.5fr_1fr_auto] items-center gap-4 border-b border-white/10 px-4 py-3 text-[11px] font-mono last:border-b-0"
            >
              <span className="truncate text-white font-black">
                {entry.githubUsername ?? "—"}
              </span>
              <span className="truncate text-zinc-500">
                {entry.email ?? "—"}
              </span>
              <span className="text-zinc-600 text-[9px] tracking-tighter">
                {formatStamp(entry.createdAt)}
              </span>
              <div className="text-right">
                <TacticalButton
                  variant="danger"
                  size="sm"
                  prefix=""
                  disabled={isPending}
                  onClick={() => handleRemove(entry.id)}
                  className="font-black"
                >
                  REVOKE
                </TacticalButton>
              </div>
            </div>
          ))
        )}
      </div>

      <TacticalFeedback
        key={feedback?.message || "none"}
        message={feedback?.message || null}
        type={feedback?.type || "success"}
        onClear={() => setFeedback(null)}
      />
    </div>
  );
}
