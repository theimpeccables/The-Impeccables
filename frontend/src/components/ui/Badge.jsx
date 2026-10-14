import React from 'react';
import { cn } from '../../utils/cn';

const statusConfig = {
  published: {
    label: 'Published',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  approved: {
    label: 'Approved',
    className: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
  under_review: {
    label: 'Under Review',
    className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  changes_requested: {
    label: 'Changes Requested',
    className: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
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
    default: 'bg-white/10 text-gray-200 border-white/10',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border tracking-wide uppercase font-mono',
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
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border font-mono tracking-wider',
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
