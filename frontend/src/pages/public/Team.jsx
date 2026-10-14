import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { TeamMemberCard } from '../../components/cards/TeamMemberCard';
import { usePublicData, PublicDataState } from '../../hooks/usePublicData';

export const Team = () => {
  const [showAll, setShowAll] = useState(false);
  const { data: teamMembers, loading, error } = usePublicData('/team');

  const displayedMembers = showAll ? teamMembers : teamMembers.slice(0, 4);

  return (
    <div className="public-page max-w-7xl mx-auto text-gray-100 flex flex-col">
      
      {/* Screen 06: Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
        <div>
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-red-400 font-bold mb-2 block">
            MEET THE TEAM
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase leading-tight font-display">
            THE PEOPLE{' '}
            <span className="text-red-500 drop-shadow-[0_0_25px_rgba(255,30,56,0.5)]">
              BEHIND THE MAGIC
            </span>
          </h1>
        </div>

        <p className="text-sm sm:text-base text-gray-400 max-w-sm leading-relaxed">
          Leaders. Creators. Doers. <br />
          The Heart of The Impeccables.
        </p>
      </div>

      {/* Screen 06: Team Avatars Row */}
      <PublicDataState loading={loading} error={error} empty="Team profiles will appear here once members opt into the public directory." isEmpty={teamMembers.length === 0}>
      <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 lg:gap-16">
        {displayedMembers.map((member) => (
          <TeamMemberCard key={member.id} member={member} />
        ))}

        {/* 5th element: (+) View Full Team Button */}
        {!showAll && teamMembers.length > 4 && (
          <div
            onClick={() => setShowAll(true)}
            className="group flex flex-col items-center text-center select-none cursor-pointer"
          >
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-dashed border-white/20 group-hover:border-red-500 group-hover:bg-red-600/10 flex items-center justify-center text-gray-400 group-hover:text-white transition-all duration-300 mb-4 shadow-lg">
              <Plus className="w-8 h-8 group-hover:scale-125 transition-transform" />
            </div>
            <h3 className="text-sm font-bold text-gray-300 group-hover:text-red-400 transition-colors">
              View Full Team
            </h3>
            <p className="text-xs font-mono text-gray-500 mt-0.5">
              +{teamMembers.length - 4} Members
            </p>
          </div>
        )}
      </div>
      </PublicDataState>

    </div>
  );
};

export default Team;
