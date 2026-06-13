"use client";

import { useState } from "react";
import type { ReactNode } from "react";
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

  async function copy(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(email);
      toast(<span className="text-green-500">✓ Copied {email}</span>);
      setTimeout(
        () => setCopied((c) => (c === email ? null : c)),
        1500
      );
    } catch {
      toast(<span className="text-red-500">✗ Couldn&apos;t copy</span>);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="relative w-full max-w-2xl border-4 border-white/80 bg-[#0a0a0a] p-12"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-8 flex items-center justify-between">
          <h2 className="retro text-2xl tracking-wider text-white">CONTACT</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="retro text-lg text-muted-foreground hover:text-white"
            aria-label="Close"
          >
            X
          </button>
        </div>

        <p className="mb-8 text-md leading-relaxed text-muted-foreground">
          Reach out to the maintainers — copy an email and say hi.
        </p>

        <div className="space-y-5">
          {CONTACTS.map((c) => (
            <div
              key={c.email}
              className="flex items-center gap-4 border-2 border-white/15 p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="retro text-[20px] text-[#22c55e]">{c.name}</p>
                <p className="mt-2 truncate text-md text-white">{c.email}</p>
              </div>
              <Button
                className="shrink-0 text-[9px]"
                onClick={() => copy(c.email)}
              >
                {copied === c.email ? "COPIED" : "COPY"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
