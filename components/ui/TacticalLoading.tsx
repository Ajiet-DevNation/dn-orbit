"use client";

import React from "react";

export function TacticalLoading({ message = "LOADING_SYSTEM_RESOURCES" }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center font-mono">
      <div className="w-96 space-y-8 p-12 border border-zinc-900 bg-zinc-950 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-white/20 animate-pulse" />
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 tracking-widest uppercase font-black italic">
              INITIALIZING_PROTOCOL
            </span>
            <span className="text-[10px] text-white animate-pulse">●</span>
          </div>
          
          <div className="h-0.5 bg-zinc-900 w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-white w-1/3 animate-[loading-bar_1.5s_infinite_ease-in-out]" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xl font-black italic tracking-tighter text-white animate-pulse">
            {message.toUpperCase()}
          </div>
          <div className="text-[8px] text-zinc-800 uppercase tracking-widest font-bold">
            ADDRESS_SPACE: 0xDEADBEEF SECURE_HAND_SHAKE
          </div>
        </div>

        <div className="flex gap-2 opacity-20">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-1 h-3 bg-white" />
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
