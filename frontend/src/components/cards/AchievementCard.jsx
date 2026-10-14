import React from 'react';
import { Medal } from 'lucide-react';
import { Card } from '../ui/Card';

export const AchievementCard = ({ item }) => {
  return (
    <Card
      hoverEffect={true}
      glowColor="amber"
      className="flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 font-bold">
            <Medal className="w-3.5 h-3.5" /> {item.year}
          </span>
          <span className="text-xs font-mono text-purple-400">
            {item.domain}
          </span>
        </div>

        <h3 className="text-lg font-bold text-white mb-2 leading-snug">
          {item.title}
        </h3>

        <div className="text-xs font-mono text-cyan-300 mb-3">
          {item.fest}
        </div>

        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
          {item.description}
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-white/5 text-[11px] font-mono text-gray-500">
        Verified by KIET Cultural Affairs Cell
      </div>
    </Card>
  );
};

export default AchievementCard;
