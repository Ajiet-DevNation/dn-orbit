"use client";

import React from "react";

export function TacticalLoading({ message = "LOADING_SYSTEM_RESOURCES" }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center font-mono dot-grid-bg">
      <div className="w-96 space-y-8 p-12 border-2 border-white/10 bg-[#0a0a0a] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-[#22c55e]/40 animate-pulse" />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="retro text-[9px] text-[#22c55e]/70 tracking-widest uppercase">
              INITIALIZING_PROTOCOL
            </span>
            <span className="text-[10px] text-[#22c55e] animate-pulse">●</span>
          </div>

          <div className="h-1 bg-white/5 w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-[#22c55e] w-1/3 animate-[loading-bar_1.5s_infinite_ease-in-out]" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="retro text-base tracking-tight text-white animate-pulse leading-relaxed">
            {message.toUpperCase()}
          </div>
          <div className="text-[8px] text-zinc-700 uppercase tracking-widest font-bold">
            ADDRESS_SPACE: 0xDEADBEEF SECURE_HAND_SHAKE
          </div>
        </div>

        <div className="flex gap-2 opacity-30">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-1 h-3 bg-[#22c55e]" />
          ))}
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
