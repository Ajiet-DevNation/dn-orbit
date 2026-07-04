"use client";

import { useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { cn } from "@/lib/utils";

// Reusable "pick → crop to a locked ratio → upload to Supabase → get URL" field.
//
// The ratio is locked to whatever the display card needs (so the image is never
// re-cropped at display time), but the user pans/zooms to choose the framing and
// can zoom all the way out to fit the WHOLE image inside the frame (padded) — so
// nothing is cropped unless they choose to. Output is a WebP at a fixed size.

const OUTPUT_WIDTH = 1280;
const PAD_BG = "#0a0a0a"; // letterbox fill when the image is zoomed out past the frame

interface ImageCropUploadProps {
  /** Locked crop ratio, e.g. 16/9 for events, 4/3 for projects. */
  aspect: number;
  kind: "event" | "project";
  /** Current image URL ("" when none). */
  value: string;
  onChange: (url: string) => void;
  className?: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

// Render the chosen crop region to a canvas at the target dims. The region may
// extend beyond the source (when zoomed out) — those areas stay the padded bg.
async function getCroppedBlob(
  src: string,
  area: Area,
  aspect: number,
): Promise<Blob> {
  const image = await loadImage(src);
  const outW = OUTPUT_WIDTH;
  const outH = Math.round(outW / aspect);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.fillStyle = PAD_BG;
  ctx.fillRect(0, 0, outW, outH);

  const scale = outW / area.width;
  ctx.drawImage(
    image,
    -area.x * scale,
    -area.y * scale,
    image.naturalWidth * scale,
    image.naturalHeight * scale,
  );

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Export failed"))),
      "image/webp",
      0.85,
    ),
  );
}

export function ImageCropUpload({
  aspect,
  kind,
  value,
  onChange,
  className,
}: ImageCropUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<Area | null>(null);

  const [src, setSrc] = useState<string | null>(null); // object URL while cropping
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickFile() {
    setError(null);
    fileInputRef.current?.click();
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setMinZoom(1);
    setSrc(URL.createObjectURL(file));
  }

  function closeCropper() {
    if (src) URL.revokeObjectURL(src);
    setSrc(null);
  }

  // The zoom at which the entire image is exactly contained in the frame
  // (react-easy-crop's zoom=1 means "cover"). Letting minZoom reach here is what
  // makes the "keep the whole image" option possible.
  function onMediaLoaded(media: {
    naturalWidth: number;
    naturalHeight: number;
  }) {
    const mediaAspect = media.naturalWidth / media.naturalHeight;
    const containZoom =
      Math.min(mediaAspect, aspect) / Math.max(mediaAspect, aspect);
    setMinZoom(containZoom);
    setZoom(1);
  }

  async function confirmCrop() {
    if (!src || !areaRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await getCroppedBlob(src, areaRef.current, aspect);
      const form = new FormData();
      form.append("file", blob, "cover.webp");
      form.append("kind", kind);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(body.error ?? `Upload failed (${res.status})`);
      onChange(body.url as string);
      closeCropper();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileSelected}
      />

      {value ? (
        <div className="flex flex-col gap-2">
          <div
            className="relative w-full overflow-hidden border-2 border-white/15 bg-[#0d0d0d]"
            style={{ aspectRatio: String(aspect) }}
          >
            {/* biome-ignore lint/performance/noImgElement: local object-URL preview — not optimizable */}
            <img
              src={value}
              alt="Selected cover"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={pickFile}
              className="retro border-2 border-white/20 px-3 py-2 text-[9px] text-white/80 transition-colors hover:border-[#22c55e] hover:text-[#22c55e]"
            >
              CHANGE
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="retro border-2 border-white/20 px-3 py-2 text-[9px] text-white/60 transition-colors hover:border-red-500 hover:text-red-500"
            >
              REMOVE
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={pickFile}
          className="retro flex w-full items-center justify-center border-2 border-dashed border-white/20 bg-[#0d0d0d] px-4 py-8 text-[9px] text-muted-foreground transition-colors hover:border-[#22c55e] hover:text-[#22c55e]"
          style={{ aspectRatio: String(aspect) }}
        >
          + UPLOAD IMAGE
        </button>
      )}

      {error && <p className="text-[10px] text-red-500">{error}</p>}

      {/* Cropper modal — above the parent form modal (z-[100]). */}
      {src && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4">
          <div className="flex w-full max-w-2xl flex-col gap-4 border-4 border-white/80 bg-[#0a0a0a] p-6">
            <div className="flex items-center justify-between">
              <h3 className="retro text-sm tracking-wider text-white">
                CROP IMAGE
              </h3>
              <button
                type="button"
                onClick={closeCropper}
                className="retro text-sm text-muted-foreground hover:text-white"
                aria-label="Cancel"
              >
                X
              </button>
            </div>

            <div className="relative h-[55vh] w-full bg-[#0d0d0d]">
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                minZoom={minZoom}
                maxZoom={3}
                zoomSpeed={0.2}
                aspect={aspect}
                restrictPosition={false}
                objectFit="contain"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onMediaLoaded={onMediaLoaded}
                onCropComplete={(_, areaPixels) =>
                  (areaRef.current = areaPixels)
                }
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="retro text-[8px] text-muted-foreground">
                FIT
              </span>
              <input
                type="range"
                min={minZoom}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="h-1 flex-1 cursor-pointer accent-[#22c55e]"
                aria-label="Zoom"
              />
              <span className="retro text-[8px] text-muted-foreground">
                ZOOM
              </span>
            </div>

            <p className="retro text-[8px] leading-relaxed text-muted-foreground">
              Drag to reposition · zoom out fully to keep the whole image.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeCropper}
                disabled={busy}
                className="retro border-2 border-white/20 px-4 py-2 text-[9px] text-white/70 transition-colors hover:border-white/40 disabled:opacity-50"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={confirmCrop}
                disabled={busy}
                className="retro border-2 border-[#22c55e] bg-[#22c55e] px-4 py-2 text-[9px] text-[#0a0a0a] transition-colors hover:bg-[#1ea34d] disabled:opacity-50"
              >
                {busy ? "UPLOADING…" : "USE IMAGE"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
