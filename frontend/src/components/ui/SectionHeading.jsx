import React from 'react';
import { cn } from '../../utils/cn';

export const SectionHeading = ({
  badge,
  title,
  highlight,
  description,
  align = 'center',
  className,
}) => {
  const alignClasses = {
    center: 'text-center items-center',
    left: 'text-left items-start',
    right: 'text-right items-end',
  };

  return (
    <div className={cn('flex flex-col mb-12 md:mb-16', alignClasses[align], className)}>
      {badge && (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest text-purple-400 bg-purple-500/10 border border-purple-500/20 mb-4 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          {badge}
        </div>
      )}

      <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white max-w-3xl leading-[1.15]">
        {title}{' '}
        {highlight && (
          <span className="bg-gradient-to-r from-purple-400 via-fuchsia-300 to-cyan-400 bg-clip-text text-transparent">
            {highlight}
          </span>
        )}
      </h2>

      {description && (
        <p className="mt-4 text-base sm:text-lg text-gray-400 max-w-2xl leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
};

export default SectionHeading;
