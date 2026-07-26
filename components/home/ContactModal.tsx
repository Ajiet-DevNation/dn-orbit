"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/8bit-button";
import { toast as rawToast } from "@/components/ui/8bit-toast";
import { PixelModal } from "@/components/ui/PixelModal";

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
      setTimeout(() => setCopied((c) => (c === email ? null : c)), 1500);
    } catch {
      toast(<span className="text-red-500">✗ Couldn&apos;t copy</span>);
    }
  }

  return (
    <PixelModal
      open={open}
      onOpenChange={onOpenChange}
      title="CONTACT"
      description="Reach out to the maintainers: copy an email, or tap to compose."
      size="sm"
    >
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
            <div className="flex shrink-0 py-1.5">
              <Button
                className="h-full text-[9px]"
                onClick={() => copy(c.email)}
                aria-label={`Copy ${c.name}'s email`}
              >
                {copied === c.email ? "COPIED" : "COPY"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </PixelModal>
  );
}
