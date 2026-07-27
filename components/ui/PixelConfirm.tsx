"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/8bit-button";
import { PixelModal } from "@/components/ui/PixelModal";

// A themed, promise-based replacement for the browser's native confirm(). The
// unstyled OS dialog breaks the 8-bit panel, so destructive admin actions use
// this instead.
//
// Built on PixelModal like every other dialog on the site. It used to hand-roll
// its own overlay, its own Escape handler and its own scroll lock (a duplicate
// of useModalBehavior), and its two actions were raw <button>s with border-2 —
// an approximation of the pixel button that had neither the corner chrome nor
// the active:translate-y-1 press.

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
  return (
    <PixelModal
      open
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      title={title}
      layer="confirm"
      size="sm"
      tone={danger ? "danger" : "accent"}
      hideClose
      footer={
        <>
          {/* Cancel first in DOM order so the focus trap lands on it — a stray
              Enter must never be the destructive action. */}
          <Button
            variant="outline"
            className="flex-1 text-[10px]"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            className={
              danger
                ? "flex-1 text-[10px] !bg-red-600 !text-white hover:!bg-red-500"
                : "flex-1 text-[10px]"
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-xs leading-relaxed text-zinc-300 sm:text-sm">
        {message}
      </p>
    </PixelModal>
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
