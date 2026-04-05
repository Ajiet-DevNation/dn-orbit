import React from 'react';

interface TacticalCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  status?: string;
}

export const TacticalCard = ({ title, subtitle, children, className, status }: TacticalCardProps) => {
  return (
    <div className={`border border-white bg-black p-6 relative font-mono ${className}`}>
      {status && (
        <div className="absolute -top-3 right-6 bg-white text-black px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase">
          {status}
        </div>
      )}
      {title && (
        <div className="mb-6 border-b border-zinc-800 pb-4">
          <h3 className="text-2xl font-black uppercase tracking-tighter text-white leading-none">{title}</h3>
          {subtitle && <p className="mt-1 text-[10px] text-zinc-500 uppercase tracking-widest">{subtitle}</p>}
        </div>
      )}
      <div className="text-zinc-400 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
};
