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
      className={`fixed bottom-8 right-8 z-[100] flex items-center gap-4 px-6 py-4 border animate-in slide-in-from-bottom-5 duration-300 ${
        type === "success" 
          ? "bg-black border-white text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
          : "bg-black border-red-900 text-red-500 shadow-[0_0_20px_rgba(153,27,27,0.1)]"
      }`}
    >
      <div className="flex flex-col">
        <div className="flex items-center gap-3 mb-1">
          {type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span className="text-[10px] font-black tracking-[0.3em] uppercase italic">
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
        className="ml-6 px-2 py-1 bg-zinc-900 text-[10px] font-black hover:bg-white hover:text-black transition-colors"
      >
        DISMISS
      </button>
    </div>
  );
}
