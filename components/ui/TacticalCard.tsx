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
      setActiveTimestamp(formatted);
    }
  }, [timestamp]);

  const borderStyles = variant === 'dashed' ? 'border-dashed border-zinc-600' : 'border-zinc-800';
  const displayTimestamp = activeTimestamp;
  
  return (
    <div className={`bg-black p-0 relative font-mono group border ${borderStyles} ${className}`}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-950/50">
        <span className="text-[9px] text-zinc-500 tracking-widest uppercase">{id}</span>
        {status && (
          <div className="bg-white text-black px-1.5 py-0.5 text-[8px] font-black tracking-tighter uppercase">
            {status}
          </div>
        )}
      </div>

      <div className="p-6">
        {title && (
          <div className="mb-6">
            <div className="flex items-baseline gap-2">
               <h3 className="text-2xl font-black uppercase tracking-tighter text-white leading-none group-hover:text-zinc-200 transition-colors">
                {title}
              </h3>
            </div>
            {subtitle && (
              <p className="mt-2 text-[9px] text-zinc-500 uppercase tracking-[0.2em] leading-tight">
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div className="text-zinc-400 text-sm">
          {children}
        </div>

        <div className="mt-8 pt-4 border-t border-zinc-900 flex items-center justify-between">
           <div className="flex flex-col">
              <span className="text-[8px] text-zinc-600 uppercase tracking-widest">Date_Stamp</span>
              <span className="text-[9px] text-zinc-400 tracking-tighter font-bold">{displayTimestamp}</span>
           </div>
           <div className="opacity-20 group-hover:opacity-100 transition-opacity">
              <div className="w-2 h-2 bg-white" />
           </div>
        </div>
      </div>

      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/40" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/40" />
    </div>
  );
};
