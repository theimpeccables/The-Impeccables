import React from 'react';
import { Trophy } from 'lucide-react';
import { AchievementCard } from '../../components/cards/AchievementCard';
import { usePublicData, PublicDataState } from '../../hooks/usePublicData';

export const Achievements = () => {
  const { data, loading, error } = usePublicData('/achievements');
  const achievements = data.map((item) => ({ ...item, year: item.awardedAt ? new Date(item.awardedAt).getFullYear() : '', domain: item.category, fest: item.event?.title || '' }));
  return (
    <div className="public-page max-w-7xl mx-auto text-gray-100">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-widest text-amber-300 bg-amber-950/60 border border-amber-500/30 mb-4">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>Milestones & Trophies</span>
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight">
          Society Achievements
        </h1>
        <p className="mt-4 text-base sm:text-lg text-gray-400 leading-relaxed">
          Celebrating the trophies, national recognitions, and competitive accolades brought home by our artists and performers.
        </p>
      </div>

      {/* Grid of honors */}
      <PublicDataState loading={loading} error={error} empty="No achievements have been published yet." isEmpty={achievements.length === 0}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map((item) => (
          <AchievementCard key={item._id || item.title} item={item} />
        ))}
      </div>
      </PublicDataState>
    </div>
  );
};

export default Achievements;
