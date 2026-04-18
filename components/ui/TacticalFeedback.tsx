"use client";

import React from 'react';
import { Terminal, AlertTriangle, ShieldCheck } from 'lucide-react';

interface TacticalFeedbackProps {
  message: string | null;
  type?: 'info' | 'error' | 'success';
  className?: string;
}

export const TacticalFeedback = ({ message, type = 'info', className = '' }: TacticalFeedbackProps) => {
  const icons = {
    info: Terminal,
    error: AlertTriangle,
    success: ShieldCheck
  };
  
  const colors = {
    info: 'border-zinc-800 text-zinc-400 bg-zinc-950',
    error: 'border-red-900/50 text-red-500 bg-red-950/20',
    success: 'border-emerald-900/50 text-emerald-500 bg-emerald-950/20'
  };

  const Icon = icons[type];

  if (!message) return null;

  return (
    <div className={`p-4 border font-mono text-xs flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-300 ${colors[type]} ${className}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="uppercase tracking-widest">{message}</span>
      <div className="ml-auto w-1 h-1 bg-current opacity-50" />
    </div>
  );
};
