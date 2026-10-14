import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-[#ff2a2a] hover:bg-[#ff4141] text-white shadow-lg shadow-red-950/30 border border-red-400/20',
  secondary:
    'bg-white/10 hover:bg-white/15 text-white border border-white/15 backdrop-blur-md',
  glow:
    'bg-[#ff2a2a] hover:bg-[#ff4141] text-white shadow-[0_0_25px_rgba(255,42,42,0.28)] hover:shadow-[0_0_35px_rgba(255,42,42,0.4)] border border-red-400/40',
  glass:
    'bg-black/40 hover:bg-black/60 text-gray-200 hover:text-white border border-white/10 backdrop-blur-xl',
  outline:
    'bg-transparent hover:bg-red-500/10 text-red-200 hover:text-white border border-red-500/40',
  danger:
    'bg-red-600/80 hover:bg-red-600 text-white border border-red-500/30 shadow-lg shadow-red-950/40',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3.5 text-base rounded-xl font-semibold gap-2.5',
};

export const Button = React.forwardRef(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      icon: Icon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff2a2a]/45',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : Icon ? (
          <Icon className="w-4 h-4 text-current" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
