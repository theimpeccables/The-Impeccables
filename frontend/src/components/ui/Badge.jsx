import React from 'react';
import { cn } from '../../utils/cn';

const statusConfig = {
  published: {
    label: 'Published',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  approved: {
    label: 'Approved',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  under_review: {
    label: 'Under Review',
    className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  changes_requested: {
    label: 'Changes Requested',
    className: 'bg-red-500/15 text-red-200 border-red-500/30',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-500/15 text-red-200 border-red-500/30',
  },
  draft: {
    label: 'Draft',
    className: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  },
};

export const Badge = ({ children, className, variant = 'default', size = 'sm' }) => {
  const sizes = {
    xs: 'px-2 py-0.5 text-[10px]',
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  const variants = {
    default: 'bg-white/[.06] text-gray-200 border-white/10',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    rose: 'bg-red-500/15 text-red-200 border-red-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium tracking-wide',
        sizes[size],
        variants[variant] || variants.default,
        className
      )}
    >
      {children}
    </span>
  );
};

export const StatusPill = ({ status, className }) => {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide',
        config.className,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {config.label}
    </span>
  );
};

export default Badge;
