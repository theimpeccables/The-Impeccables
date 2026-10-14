import React from 'react';
import { IMPACT_STATS } from '../../constants';
import { cn } from '../../utils/cn';

export const ImpactStatsSection = ({ stats = IMPACT_STATS, className }) => {
  return (
    <section className={cn('relative py-20 border-y border-white/5 bg-[#09090f]/70 backdrop-blur-md', className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, idx) => (
            <div key={idx} className="p-6">
              <div className={cn('text-4xl sm:text-5xl font-black font-mono', stat.color)}>
                {stat.count}
              </div>
              <div className="mt-2 text-sm text-gray-300 font-medium">{stat.label}</div>
              <div className="mt-1 text-xs text-gray-500">{stat.subtext}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ImpactStatsSection;
