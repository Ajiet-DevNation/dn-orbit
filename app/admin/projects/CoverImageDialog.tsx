"use client";

import { useState } from "react";
import { Button } from "@/components/ui/8bit-button";
import { FIELD_ERROR, Input } from "@/components/ui/8bit-input";
import { Label } from "@/components/ui/8bit-label";
import { PixelModal } from "@/components/ui/PixelModal";

interface CoverImageDialogProps {
  project: {
    title: string;
    imageUrl: string | null;
  };
  /** True while the parent's save transition is in flight. */
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  /** Receives the pasted URL, or null to clear (back to the placeholder). */
  onSave: (imageUrl: string | null) => void;
}

// Admin cover editor: paste an image URL — deliberately storage-free, so it
// works regardless of whether the media bucket is configured. Empty is always
// valid: clearing reverts to the placeholder card. URL shape is re-validated
// server-side.
export function CoverImageDialog({
  project,
  busy,
  onOpenChange,
  onSave,
}: CoverImageDialogProps) {
  const [value, setValue] = useState(project.imageUrl ?? "");
  // Remembers WHICH src failed, so a later paste of a working URL retries on
  // its own — no effect needed to reset a boolean.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const trimmed = value.trim();
  // Cheap client-side guard so the SAVE button reacts while typing; the server
  // action enforces the same rule (http/https only) authoritatively.
  const valid = trimmed === "" || /^https?:\/\//i.test(trimmed);

  // The only image that can render is a pasted one — no auto-cover fallback.
  const effectiveSrc = valid && trimmed !== "" ? trimmed : null;
  const previewFailed = !!effectiveSrc && failedSrc === effectiveSrc;

  return (
    <PixelModal
      open
      onOpenChange={(next) => {
        if (!next && !busy) onOpenChange(false);
      }}
      title="COVER IMAGE"
      description={project.title}
      size="md"
      footer={
        <>
          <Button
            variant="outline"
            className="flex-1 text-[10px]"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            CANCEL
          </Button>
          <Button
            className="flex-1 text-[10px] !bg-brand !text-black hover:!bg-brand-light"
            onClick={() => onSave(trimmed === "" ? null : trimmed)}
            disabled={busy || !valid}
          >
            {busy ? "SAVING…" : "SAVE"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="cover-url">IMAGE URL</Label>
          <Input
            id="cover-url"
            type="url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://example.com/cover.png"
            autoFocus
          />
          {!valid && (
            <p className={FIELD_ERROR}>Must start with http:// or https://</p>
          )}
          <p className="retro text-[8px] leading-relaxed text-muted-foreground">
            OPTIONAL — leave empty to show the default placeholder card.
          </p>
        </div>

        {/* Preview at the card's 5:4 crop so the admin sees what the carousel
            will render. Broken links fall back to the same message the card
            would show, instead of a browser broken-image icon. */}
        <div className="relative aspect-[5/4] w-full overflow-hidden border-2 border-white/15 bg-[#0d0d0d]">
          {effectiveSrc && !previewFailed ? (
            // biome-ignore lint/performance/noImgElement: arbitrary remote host — next/image would need per-host config
            <img
              key={effectiveSrc}
              src={effectiveSrc}
              alt="Cover preview"
              onError={() => setFailedSrc(effectiveSrc)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-4">
              <span className="retro text-center text-[8px] leading-relaxed text-zinc-600">
                {previewFailed
                  ? "PREVIEW UNAVAILABLE — THE URL DID NOT LOAD"
                  : "NO IMAGE — THE PLACEHOLDER CARD WILL RENDER"}
              </span>
            </div>
          )}
        </div>
      </div>
    </PixelModal>
  );
}
