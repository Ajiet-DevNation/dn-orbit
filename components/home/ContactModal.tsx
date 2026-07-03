"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/8bit-button";
import { toast as rawToast } from "@/components/ui/8bit-toast";

const toast = rawToast as unknown as (message: ReactNode) => void;

const CONTACTS = [
  { name: "TWAHA", email: "aboobakkartwaha@gmail.com" },
  { name: "MUAZ", email: "6muazx@gmail.com" },
];

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactModal({ open, onOpenChange }: ContactModalProps) {
  const [copied, setCopied] = useState<string | null>(null);

  // Escape-to-close + lock body scroll while open (keyboard/a11y parity with a
  // real dialog; the site's global motion reset means no entrance animation).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange]);

  async function copy(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(email);
      toast(<span className="text-green-500">✓ Copied {email}</span>);
      setTimeout(() => setCopied((c) => (c === email ? null : c)), 1500);
    } catch {
      toast(<span className="text-red-500">✗ Couldn&apos;t copy</span>);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        className="relative w-full max-w-lg border-4 border-white/80 bg-[#0a0a0a] p-6 sm:p-8 retro dark"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-2 flex items-start justify-between gap-4">
          <h2
            id="contact-modal-title"
            className="retro text-lg tracking-wider text-white sm:text-2xl"
          >
            CONTACT
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="retro -mr-1 -mt-1 shrink-0 p-1 text-base text-zinc-500 hover:text-[#22c55e]"
            aria-label="Close contact dialog"
          >
            X
          </button>
        </div>

        <p className="mb-7 text-xs leading-relaxed text-zinc-400 sm:text-sm">
          Reach out to the maintainers: copy an email, or tap to compose.
        </p>

        {/* Contact list */}
        <ul className="space-y-4">
          {CONTACTS.map((c) => (
            <li
              key={c.email}
              className="flex items-center gap-3 border-2 border-white/15 bg-white/[0.02] p-3 hover:border-[#22c55e]/50 sm:gap-4 sm:p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="retro text-sm text-[#22c55e] sm:text-base">
                  {c.name}
                </p>
                <a
                  href={`mailto:${c.email}`}
                  className="mt-1.5 block truncate text-[11px] text-white hover:text-[#22c55e] sm:text-sm"
                  title={c.email}
                >
                  {c.email}
                </a>
              </div>
              <Button
                className="shrink-0 text-[9px]"
                onClick={() => copy(c.email)}
                aria-label={`Copy ${c.name}'s email`}
              >
                {copied === c.email ? "COPIED" : "COPY"}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
