import React from 'react';

interface TacticalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const TacticalButton = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className, 
  ...props 
}: TacticalButtonProps) => {
  const baseStyles = "inline-flex items-center justify-center font-mono uppercase font-bold transition-all duration-200 border border-white disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-white text-black hover:bg-black hover:text-white",
    outline: "bg-black text-white hover:bg-white hover:text-black",
    ghost: "border-transparent bg-transparent text-white hover:bg-white/10"
  };

  const sizes = {
    sm: "px-2 py-1 text-[10px] tracking-widest",
    md: "px-4 py-2 text-xs tracking-widest",
    lg: "px-6 py-3 text-sm tracking-widest"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
