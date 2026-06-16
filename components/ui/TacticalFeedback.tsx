"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface TacticalFeedbackProps {
  message: string | null;
  type: "success" | "error";
  onClear?: () => void;
  autoHideMs?: number;
}

export function TacticalFeedback({ 
  message, 
  type, 
  onClear, 
  autoHideMs = 5000 
}: TacticalFeedbackProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (message && !isDismissed && autoHideMs > 0) {
      const timer = setTimeout(() => {
        setIsDismissed(true);
        if (onClear) onClear();
      }, autoHideMs);
      return () => clearTimeout(timer);
    }
  }, [message, isDismissed, autoHideMs, onClear]);

  if (!message || isDismissed) return null;

  return (
    <div 
      className={`fixed bottom-8 right-8 z-[100] flex items-center gap-4 px-6 py-4 border-2 animate-in slide-in-from-bottom-5 duration-300 ${
        type === "success"
          ? "bg-[#0a0a0a] border-[#22c55e] text-[#22c55e] shadow-[0_0_20px_rgba(34,197,94,0.15)]"
          : "bg-[#0a0a0a] border-red-700 text-red-500 shadow-[0_0_20px_rgba(153,27,27,0.15)]"
      }`}
    >
      <div className="flex flex-col">
        <div className="flex items-center gap-3 mb-2">
          {type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span className="retro text-[9px] tracking-[0.3em] uppercase">
            {type === "success" ? "SYSTEM_CONFIRMED" : "SYSTEM_EXCEPTION"}
          </span>
        </div>
        <div className="text-[11px] font-black tracking-tight font-mono max-w-sm text-balance">
          {message.toUpperCase()}
        </div>
      </div>

      <button
        onClick={() => {
          setIsDismissed(true);
          if (onClear) onClear();
        }}
        className="retro ml-6 px-2 py-1.5 border-2 border-current text-[8px] hover:bg-[#22c55e] hover:text-black hover:border-[#22c55e] transition-colors"
      >
        DISMISS
      </button>
    </div>
  );
}
