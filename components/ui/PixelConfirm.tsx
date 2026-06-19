"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// A themed, promise-based replacement for the browser's native confirm(). The
// unstyled OS dialog breaks the 8-bit panel, so destructive admin actions use
// this pixel modal instead. Mirrors the dialog idiom used by ContactModal:
// Escape-to-cancel, body-scroll lock, backdrop click = cancel, role="dialog".

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm action as destructive (red). Defaults to true. */
  danger?: boolean;
}

function PixelConfirmDialog({
  title = "ARE YOU SURE?",
  message,
  confirmLabel = "CONFIRM",
  cancelLabel = "CANCEL",
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmOptions & { onConfirm: () => void; onCancel: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Escape-to-cancel + lock body scroll while open. Focus the non-destructive
  // Cancel action by default so a stray Enter never deletes anything.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pixel-confirm-title"
        aria-describedby="pixel-confirm-message"
        className="retro dark relative w-full max-w-md border-4 border-white/80 bg-[#0a0a0a] p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="pixel-confirm-title"
          className={`retro text-sm tracking-wider sm:text-base ${
            danger ? "text-red-400" : "text-[#22c55e]"
          }`}
        >
          {title}
        </h2>
        <p
          id="pixel-confirm-message"
          className="mt-4 text-xs leading-relaxed text-zinc-300 sm:text-sm"
        >
          {message}
        </p>
        <div className="mt-7 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="retro border-2 border-white/25 px-4 py-2 text-[9px] text-white/70 transition-colors hover:border-white hover:text-white"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              danger
                ? "retro border-2 border-red-500 px-4 py-2 text-[9px] text-red-400 transition-colors hover:bg-red-500 hover:text-black"
                : "retro border-2 border-[#22c55e] px-4 py-2 text-[9px] text-[#22c55e] transition-colors hover:bg-[#22c55e] hover:text-black"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Imperative confirm for client components. Returns a `confirm(opts)` that
 * resolves to a boolean, plus the `dialog` node to render in the component tree:
 *
 *   const { confirm, dialog } = useConfirm();
 *   const ok = await confirm({ message: "Delete this?" });
 *   return <>{table}{dialog}</>;
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  }, []);

  const dialog = options ? (
    <PixelConfirmDialog
      {...options}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  ) : null;

  return { confirm, dialog };
}
