import React from 'react';
import { cn } from '../../utils/cn';

export const TeamMemberCard = ({ member, className }) => {
  return (
    <div
      className={cn(
        'group flex flex-col items-center text-center select-none cursor-pointer',
        className
      )}
    >
      {/* Circular Avatar with Glowing Red Neon Ring */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-red-600 via-rose-500 to-red-800 shadow-[0_0_20px_rgba(255,30,56,0.35)] group-hover:shadow-[0_0_30px_rgba(255,30,56,0.7)] group-hover:scale-105 transition-all duration-300 mb-4">
        <div className="w-full h-full rounded-full overflow-hidden bg-black/60 border border-white/20">
          <img
            src={member.image}
            alt={member.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
        </div>
      </div>

      {/* Name & Role */}
      <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-red-400 transition-colors">
        {member.name}
      </h3>
      <p className="text-xs font-mono text-gray-400 mt-0.5">
        {member.role}
      </p>
    </div>
  );
};

export default TeamMemberCard;
