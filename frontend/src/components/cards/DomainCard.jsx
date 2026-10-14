import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

export const DomainCard = ({ domain, className }) => {
  return (
    <Link
      to={`/domains/${domain.slug}`}
      className={cn(
        'group relative rounded-2xl bg-[#0c0c14] border border-white/10 hover:border-red-500/60 transition-all duration-300 p-5 flex flex-col items-center justify-between overflow-hidden shadow-xl hover:-translate-y-1.5 hover:shadow-[0_12px_35px_-8px_rgba(255,30,56,0.35)] cursor-pointer select-none',
        className
      )}
    >
      {/* Background ambient red spotlight */}
      <div className="pointer-events-none absolute inset-0 bg-radial from-red-600/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* 3D Visual Object Container */}
      <div className="relative w-full aspect-square max-w-[160px] rounded-xl overflow-hidden flex items-center justify-center mb-3">
        <img
          src={domain.coverImage}
          alt={domain.name}
          className="w-full h-full object-cover rounded-xl group-hover:scale-110 transition-transform duration-500 brightness-95 group-hover:brightness-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c14] via-transparent to-transparent opacity-60" />
      </div>

      {/* Domain Name Label */}
      <div className="text-center w-full z-10 pt-2 border-t border-white/5">
        <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-red-400 transition-colors tracking-tight">
          {domain.name}
        </h3>
      </div>
    </Link>
  );
};

export default DomainCard;
