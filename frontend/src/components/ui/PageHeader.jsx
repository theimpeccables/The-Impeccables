import React from 'react';
import { cn } from '../../utils/cn';

export const PageHeader = ({
  badge,
  badgeIcon: Icon,
  title,
  highlight,
  description,
  className,
  center = false,
  children,
}) => {
  return (
    <div className={cn('mb-7 flex flex-col gap-2 sm:mb-8', center && 'mx-auto text-center', className)}>
      {badge && (
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-red-500/30 bg-red-950/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.2em] text-red-200">
          {Icon && <Icon className="h-3.5 w-3.5 text-red-400" />}
          <span>{badge}</span>
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            {title} {highlight && <span className="text-red-400">{highlight}</span>}
          </h1>
          {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  );
};

export default PageHeader;
