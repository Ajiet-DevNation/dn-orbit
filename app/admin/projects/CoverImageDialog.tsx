"use client";

import { useState } from "react";
import { Button } from "@/components/ui/8bit-button";
import { FIELD_ERROR, Input } from "@/components/ui/8bit-input";
import { Label } from "@/components/ui/8bit-label";
import { ImageCropUpload } from "@/components/ui/ImageCropUpload";
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

// Admin cover editor: upload from the device (cropped to the card's 5:4, into
// the media bucket — same field as the new-project form) or paste an image
// URL. Empty is always valid: clearing reverts to the placeholder card. URL
// shape is re-validated server-side.
export function CoverImageDialog({
  project,
  busy,
  onOpenChange,
  onSave,
}: CoverImageDialogProps) {
  const [value, setValue] = useState(project.imageUrl ?? "");

  const trimmed = value.trim();
  // Cheap client-side guard so the SAVE button reacts while typing; the server
  // action enforces the same rule (http/https only) authoritatively.
  const valid = trimmed === "" || /^https?:\/\//i.test(trimmed);

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
        {/* Preview + upload at the card's 5:4 crop, so the admin sees what the
            carousel will render. A dead link shows a message, not a broken
            image. Only a well-formed URL is previewed. */}
        <div className="grid gap-2">
          <Label>COVER IMAGE (5:4)</Label>
          <ImageCropUpload
            aspect={5 / 4}
            kind="project"
            value={valid ? trimmed : ""}
            onChange={setValue}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="cover-url">OR PASTE AN IMAGE URL</Label>
          <Input
            id="cover-url"
            type="url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://example.com/cover.png"
          />
          {!valid && (
            <p className={FIELD_ERROR}>Must start with http:// or https://</p>
          )}
          <p className="retro text-[8px] leading-relaxed text-muted-foreground">
            OPTIONAL — leave empty to show the default placeholder card.
          </p>
        </div>
      </div>
    </PixelModal>
  );
}
