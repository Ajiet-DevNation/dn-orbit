"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { SiLeetcode } from "react-icons/si";
import { Button } from "@/components/ui/8bit-button";
import { Input } from "@/components/ui/8bit-input";
import { toast as rawToast } from "@/components/ui/8bit-toast";

const toast = rawToast as unknown as (message: ReactNode) => void;
function notify(kind: "success" | "error", message: string) {
  const color = kind === "success" ? "text-green-500" : "text-red-500";
  toast(<span className={color}>{message}</span>);
}

interface LcPreview {
  username: string;
  realName: string | null;
  avatar: string | null;
  ranking: number | null;
  totalSolved: number;
}

interface LeetCodeConnectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputClassName?: string;
  disabled?: boolean;
  /** Visual error state on the input (parent-driven validation). */
  invalid?: boolean;
}

/**
 * LeetCode username field with a CONNECT button. LeetCode offers no OAuth, so
 * "connecting" resolves the typed handle to its live public profile and shows it
 * back (avatar, name, ranking, solved). The user confirms the real account
 * before saving — invalid or mistyped handles never resolve, so they can't be
 * saved by accident. On a successful match the stored value is normalised to the
 * canonical handle LeetCode returns.
 */
export function LeetCodeConnect({
  id,
  value,
  onChange,
  placeholder,
  inputClassName,
  disabled,
  invalid,
}: LeetCodeConnectProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<LcPreview | null>(null);

  async function connect() {
    const username = value.trim();
    if (!username) {
      notify("error", "Enter your LeetCode username first");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stats/lc/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);

      const data = body.data as LcPreview;
      setPreview(data);
      // Store the canonical handle LeetCode reports (fixes casing differences).
      if (data.username && data.username !== value) onChange(data.username);
      notify("success", `✓ Connected as ${data.username}`);
    } catch (err) {
      setPreview(null);
      notify("error", `✗ ${err instanceof Error ? err.message : "Verification failed"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-stretch gap-3 [&>div]:min-w-0">
        <Input
          id={id}
          value={value}
          placeholder={placeholder}
          disabled={disabled || loading}
          onChange={(e) => {
            onChange(e.target.value);
            if (preview) setPreview(null); // edits invalidate the confirmation
          }}
          className={`flex-1 ${invalid ? "border-destructive focus-visible:ring-destructive" : ""} ${inputClassName ?? ""}`}
        />
        <Button
          type="button"
          onClick={connect}
          disabled={disabled || loading || !value.trim()}
          className="shrink-0 text-[9px] !bg-[#22c55e] hover:!bg-[#16a34a] !text-black"
        >
          {loading ? "…" : "CONNECT"}
        </Button>
      </div>

      {preview && (
        <div className="flex items-center gap-3 border-2 border-[#22c55e]/60 bg-[#22c55e]/[0.06] p-3">
          {preview.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.avatar}
              alt={preview.username}
              className="pixelated size-10 shrink-0 border-2 border-[#22c55e]/40 object-cover select-none"
              draggable={false}
            />
          ) : (
            <span className="flex size-10 shrink-0 items-center justify-center border-2 border-[#22c55e]/40 text-[#22c55e]">
              <SiLeetcode className="size-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="retro truncate text-[10px] text-white">
              {preview.realName || preview.username}
            </p>
            <p className="retro mt-1 truncate text-[8px] tracking-widest text-[#22c55e]">
              ✓ {preview.totalSolved} SOLVED
              {preview.ranking != null
                ? ` · #${preview.ranking.toLocaleString()}`
                : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
