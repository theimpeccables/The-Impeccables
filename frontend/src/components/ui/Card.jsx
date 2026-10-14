import React from 'react';
import { cn } from '../../utils/cn';
import { THEME } from '../../constants';

export const Card = ({
  children,
  className,
  hoverEffect = true,
  glowColor = 'red',
  ...props
}) => {
  const glowStyles = THEME.glowStyles;

  return (
    <div
      className={cn(
        'relative rounded-2xl bg-[#0f0f18]/80 backdrop-blur-xl border border-white/8 p-6 text-gray-100 transition-all duration-300 shadow-xl overflow-hidden',
        hoverEffect && [
          'hover:-translate-y-1',
          glowStyles[glowColor] || glowStyles.default,
        ],
        className
      )}
      {...props}
    >
      {/* Subtle top glare gradient */}
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {children}
    </div>
  );
};

export default Card;
