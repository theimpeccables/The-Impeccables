import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { AnnouncementCard } from '../../components/cards/AnnouncementCard';
import { usePublicData, PublicDataState } from '../../hooks/usePublicData';

export const Announcements = () => {
  const [showAll, setShowAll] = useState(false);
  const { data, loading, error } = usePublicData('/announcements', { params: { limit: showAll ? 50 : 12 } });
  const announcements = data.map((item) => ({ ...item, id: item._id || item.id, date: new Date(item.sentAt || item.createdAt).toLocaleDateString() }));
  return (
    <div className="public-page max-w-6xl mx-auto text-gray-100 flex flex-col">
      
      {/* Screen 07: Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-red-400 font-bold mb-2 block">
            ANNOUNCEMENTS
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase leading-tight font-display">
            STAY{' '}
            <span className="text-red-500 drop-shadow-[0_0_25px_rgba(255,30,56,0.5)]">
              IN THE LOOP
            </span>
          </h1>
        </div>

        <button
          onClick={() => setShowAll((value) => !value)}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <span>{showAll ? 'Recent Updates' : 'All Updates'}</span>
          <ArrowRight className="w-3.5 h-3.5 text-red-500" />
        </button>
      </div>

      {/* Screen 07: 3 Announcement Cards Grid */}
      <PublicDataState loading={loading} error={error} empty="No public announcements have been posted yet." isEmpty={announcements.length === 0}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {announcements.map((ann) => (
          <AnnouncementCard key={ann.id} item={ann} />
        ))}
      </div>
      </PublicDataState>

    </div>
  );
};

export default Announcements;
