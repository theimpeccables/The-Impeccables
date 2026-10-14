import React from 'react';
import { Megaphone, Calendar, Shirt } from 'lucide-react';
import { cn } from '../../utils/cn';

const iconMap = {
  Megaphone: Megaphone,
  Calendar: Calendar,
  Shirt: Shirt,
};

export const AnnouncementCard = ({ item, className }) => {
  const IconComponent = iconMap[item.icon] || Megaphone;

  return (
    <div
      className={cn(
        'group relative min-h-40 rounded-xl bg-gradient-to-br from-[#151518] to-[#0c0c0f] border border-white/10 hover:border-red-500/40 p-4 sm:p-5 flex gap-4 transition-all duration-300 shadow-lg hover:-translate-y-1 hover:shadow-[0_10px_30px_-5px_rgba(255,30,56,0.22)]',
        className
      )}
    >
      <div className="w-10 h-10 rounded-lg bg-red-600/10 text-red-500 flex items-center justify-center shrink-0 mt-1 group-hover:drop-shadow-[0_0_12px_rgba(255,30,56,0.75)] transition-all">
        <IconComponent className="w-7 h-7" strokeWidth={1.8} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-red-400 transition-colors">
          {item.title}
        </h3>

        {/* Summary Description */}
        <p className="mt-1.5 text-xs sm:text-sm text-gray-400 leading-relaxed">
          {item.summary}
        </p>
        <div className="mt-auto pt-3 flex items-center gap-1.5 text-[11px] font-mono text-gray-400">
          <Calendar className="w-3.5 h-3.5 text-gray-500" />
          <span>{item.date}</span>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementCard;
