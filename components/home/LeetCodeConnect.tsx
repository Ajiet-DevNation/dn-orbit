"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { SiLeetcode } from "react-icons/si";
import { Button } from "@/components/ui/8bit-button";
import { Input } from "@/components/ui/8bit-input";
import { toast as rawToast } from "@/components/ui/8bit-toast";
import { PixelCheck, PixelCross } from "@/components/ui/PixelIcons";

const toast = rawToast as unknown as (message: ReactNode) => void;
function notify(kind: "success" | "error", message: string) {
  const color = kind === "success" ? "text-brand-light" : "text-red-500";
  toast(
    <span className={`inline-flex items-center gap-2 ${color}`}>
      {kind === "success" ? <PixelCheck /> : kind === "error" && <PixelCross />}
      {message}
    </span>,
  );
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
      notify("success", `Connected as ${data.username}`);
    } catch (err) {
      setPreview(null);
      notify(
        "error",
        `${err instanceof Error ? err.message : "Verification failed"}`,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-stretch gap-4 [&>div]:min-w-0">
        <Input
          id={id}
          value={value}
          placeholder={placeholder}
          disabled={disabled || loading}
          onChange={(e) => {
            onChange(e.target.value);
            if (preview) setPreview(null); // edits invalidate the confirmation
          }}
          aria-invalid={invalid}
          className="flex-1"
        />
        {/* The 8-bit Button paints its pixel border 6px OUTSIDE its box, top and
            bottom, while the Input's frame is inside its own. Stretching both to
            the row height therefore made the button overhang by 12px and read as
            floating above the field. Insetting the button by exactly that 6px
            lands its painted edges flush with the input's. */}
        <div className="flex shrink-0 py-1.5">
          <Button
            type="button"
            onClick={connect}
            disabled={disabled || loading || !value.trim()}
            className="h-full text-[9px] !bg-brand hover:!bg-brand-light !text-black"
          >
            {loading ? "…" : "CONNECT"}
          </Button>
        </div>
      </div>

      {preview && (
        <div className="flex items-center gap-3 border-2 border-brand/60 bg-brand/[0.06] p-3">
          {preview.avatar ? (
            // biome-ignore lint/performance/noImgElement: arbitrary remote host — next/image would need per-host config
            <img
              src={preview.avatar}
              alt={preview.username}
              className="pixelated size-10 shrink-0 border-2 border-brand/40 object-cover select-none"
              draggable={false}
            />
          ) : (
            <span className="flex size-10 shrink-0 items-center justify-center border-2 border-brand/40 text-brand-light">
              <SiLeetcode className="size-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="retro truncate text-[10px] text-white">
              {preview.realName || preview.username}
            </p>
            <p className="retro mt-1 truncate text-[8px] tracking-widest text-brand-light">
              <PixelCheck className="mr-1.5" />
              {preview.totalSolved} SOLVED
              {preview.ranking != null
                ? ` · #${preview.ranking.toLocaleString("en-US")}`
                : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
