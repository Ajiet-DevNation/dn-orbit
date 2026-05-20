import React from 'react';

interface TacticalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  prefix?: string;
}

export const TacticalButton = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  prefix = "> ",
  className, 
  ...props 
}: TacticalButtonProps) => {
  const baseStyles = "inline-flex items-center justify-center font-mono uppercase font-bold transition-all duration-200 border disabled:opacity-50 disabled:cursor-not-allowed tracking-widest";
  
  const variants = {
    primary: "bg-white text-black hover:bg-black hover:text-white border-white",
    outline: "bg-black text-white hover:bg-white hover:text-black border-white/40 hover:border-white",
    ghost: "border-transparent bg-transparent text-zinc-500 hover:text-white hover:bg-white/5",
    danger: "bg-black text-red-500 border-red-900 hover:bg-red-600 hover:text-white hover:border-red-600"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-[9px]",
    md: "px-4 py-2 text-[10px]",
    lg: "px-6 py-3 text-xs"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      <span className="mr-2 opacity-50 group-hover:opacity-100 transition-opacity">{prefix}</span>
      {children}
    </button>
  );
};
