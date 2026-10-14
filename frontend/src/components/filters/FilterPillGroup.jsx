import React from 'react';
import { cn } from '../../utils/cn';

export const FilterPillGroup = ({
  label,
  options = [],
  activeValue,
  onChange,
  className,
  size = 'sm',
}) => {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {label && (
        <span className="text-xs font-mono text-gray-500 mr-1 select-none">
          {label}
        </span>
      )}
      {options.map((opt) => {
        const isActive = activeValue === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-lg font-mono transition-all select-none cursor-pointer',
              size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1.5 text-xs',
              isActive
                ? 'bg-purple-600 text-white font-medium shadow-md shadow-purple-950/40 border border-purple-400/30'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export default FilterPillGroup;
