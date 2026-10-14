import React from 'react';
import { DomainCard } from '../../components/cards/DomainCard';
import { usePublicData, PublicDataState } from '../../hooks/usePublicData';

export const Domains = () => {
  const { data, loading, error } = usePublicData('/domains');
  const domains = data.map((domain) => ({ ...domain, id: domain.slug, shortDesc: domain.shortDescription || domain.description }));
  // Split domains into rows matching reference: 4 on top, 5 on bottom
  const topRow = domains.slice(0, 4);
  const bottomRow = domains.slice(4);

  return (
    <div className="public-page max-w-7xl mx-auto text-gray-100 flex flex-col">
      
      {/* Screen 03 Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-red-400 font-bold mb-2 block">
            OUR DOMAINS
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase leading-tight font-display">
            EXPLORE OUR{' '}
            <span className="text-red-500 drop-shadow-[0_0_25px_rgba(255,30,56,0.5)]">
              DIMENSIONS
            </span>
          </h1>
        </div>

        <p className="text-sm sm:text-base text-gray-400 max-w-md leading-relaxed">
          From the stage to the lens, from words to visuals — The Impeccables is home to many forms of creativity.
        </p>
      </div>

      {/* Red accent divider line */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-1 rounded-full bg-red-600" />
        <div className="w-2 h-1 rounded-full bg-red-600/50" />
      </div>

      {/* Top Row: 4 cards (larger) - matching reference */}
      <PublicDataState loading={loading} error={error} empty="No creative domains have been published yet." isEmpty={domains.length === 0}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
          {topRow.map((domain) => (
            <DomainCard key={domain.id} domain={domain} />
          ))}
        </div>

        {/* Bottom Row: 5 cards - matching reference */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
          {bottomRow.map((domain) => (
            <DomainCard key={domain.id} domain={domain} />
          ))}
        </div>
      </PublicDataState>

    </div>
  );
};

export default Domains;
