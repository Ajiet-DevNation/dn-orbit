"use client";

import React, { useState, useEffect } from 'react';

interface TacticalCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  status?: string;
  id?: string;
  timestamp?: string;
  variant?: 'default' | 'dashed' | 'accent';
}

export const TacticalCard = ({ 
  title, 
  subtitle, 
  children, 
  className, 
  status, 
  id = "ARCHIVE_ID: 0xSTATIC", 
  timestamp,
  variant = 'default'
}: TacticalCardProps) => {
  const [activeTimestamp, setActiveTimestamp] = useState(timestamp || "2026.04.18");

  useEffect(() => {
    if (!timestamp) {
      const now = new Date();
      const formatted = now.toLocaleDateString('en-CA').replace(/-/g, '.');
      // Use requestAnimationFrame to avoid synchronous setState warning
      requestAnimationFrame(() => {
        setActiveTimestamp(formatted);
      });
    }
  }, [timestamp]);

  const borderStyles = variant === 'dashed' ? 'border-dashed border-white/20' : 'border-white/10';
  const displayTimestamp = activeTimestamp;

  return (
    <div className={`bg-[#0a0a0a] p-0 relative font-mono group border-2 ${borderStyles} ${className}`}>
      <div className="flex items-center justify-between px-4 py-2 border-b-2 border-white/10 bg-[#22c55e]/[0.06]">
        <span className="retro text-[8px] text-[#22c55e]/70 tracking-widest uppercase">{id}</span>
        {status && (
          <div className="retro bg-[#22c55e] text-black px-1.5 py-1 text-[7px] tracking-tighter uppercase">
            {status}
          </div>
        )}
      </div>

      <div className="p-6">
        {title && (
          <div className="mb-6">
            <div className="flex items-baseline gap-2">
               <h3 className="retro text-sm uppercase text-white leading-relaxed group-hover:text-[#22c55e] transition-colors">
                {title}
              </h3>
            </div>
            {subtitle && (
              <p className="mt-3 text-[9px] text-zinc-500 uppercase tracking-[0.2em] leading-tight">
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div className="text-zinc-400 text-sm">
          {children}
        </div>

        <div className="mt-8 pt-4 border-t-2 border-white/5 flex items-center justify-between">
           <div className="flex flex-col gap-1">
              <span className="retro text-[7px] text-zinc-600 uppercase tracking-widest">Date_Stamp</span>
              <span className="text-[9px] text-zinc-400 tracking-tighter font-bold">{displayTimestamp}</span>
           </div>
           <div className="opacity-30 group-hover:opacity-100 transition-opacity">
              <div className="w-2 h-2 bg-[#22c55e]" />
           </div>
        </div>
      </div>

      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#22c55e]/60" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#22c55e]/60" />
    </div>
  );
};
