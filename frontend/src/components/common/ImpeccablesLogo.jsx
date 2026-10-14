import React from 'react';
import logoImg from '../../assets/impeccables-logo.png';
import { cn } from '../../utils/cn';

export const ImpeccablesLogo = ({
  className = 'w-10 h-8',
  glow = true,
  withText = false,
  textSize = 'text-base sm:text-lg',
  subtitle = null,
}) => {
  const logoMark = (
    <div className={cn('relative inline-flex items-center justify-center select-none shrink-0', className)}>
      <img
        src={logoImg}
        alt="The Impeccables"
        className={cn(
          'w-full h-full object-contain mix-blend-screen transition-all duration-300',
          glow && 'drop-shadow-[0_0_16px_rgba(255,30,56,0.75)]'
        )}
        loading="eager"
      />
    </div>
  );

  if (!withText) {
    return logoMark;
  }

  return (
    <div className="flex items-center gap-3 select-none">
      {logoMark}
      <div className="flex flex-col">
        <span className={cn('font-black tracking-tight text-white uppercase', textSize)}>
          THE IMPECCABLES
        </span>
        {subtitle && (
          <span className="text-[10px] font-mono uppercase tracking-wider text-red-400">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default ImpeccablesLogo;
