import React from 'react';
import { cn } from '../../utils/cn';

export const PageHeader = ({
  badge,
  badgeIcon: Icon,
  title,
  highlight,
  description,
  className,
  center = true,
}) => {
  return (
    <div className={cn('max-w-3xl mb-12', center && 'mx-auto text-center', className)}>
      {badge && (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-widest text-purple-300 bg-purple-950/60 border border-purple-500/30 mb-4">
          {Icon && <Icon className="w-3.5 h-3.5 text-purple-400" />}
          <span>{badge}</span>
        </div>
      )}
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight">
        {title} {highlight && <span className="text-purple-300">{highlight}</span>}
      </h1>
      {description && (
        <p className="mt-4 text-base sm:text-lg text-gray-400 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
};

export default PageHeader;
