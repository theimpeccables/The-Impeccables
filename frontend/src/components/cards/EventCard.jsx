import React from 'react';
import { Calendar, MapPin, ArrowRight, Clock } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Link } from 'react-router-dom';

export const EventCard = ({ event, className }) => {
  return (
    <div
      className={cn(
        'group relative rounded-2xl bg-[#0b0b12]/80 border border-red-500/20 hover:border-red-500/50 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-5 transition-all duration-300 shadow-xl hover:shadow-[0_10px_30px_-5px_rgba(255,30,56,0.25)] select-none overflow-hidden backdrop-blur-sm',
        className
      )}
    >
      {/* Ambient glow behind card */}
      <div className="pointer-events-none absolute -bottom-8 -left-8 w-32 h-32 bg-red-600/15 blur-[60px] rounded-full" />

      {/* Left: Date Badge + Thumbnail + Details */}
      <div className="flex items-center gap-4 sm:gap-5 w-full sm:w-auto relative z-10">
        {/* Solid Red Circle Date Badge (matching reference) */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600 flex flex-col items-center justify-center shrink-0 shadow-[0_0_20px_rgba(255,30,56,0.5)]">
          <span className="text-lg sm:text-xl font-black font-mono text-white leading-none">
            {event.day || '02'}
          </span>
          <span className="text-[9px] font-mono tracking-widest uppercase text-white/90 font-bold mt-0.5">
            {event.month || 'APR'}
          </span>
        </div>

        {/* Event Poster Thumbnail */}
        <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl overflow-hidden bg-black/60 shrink-0 border border-white/10 shadow-md">
          <img
            src={event.poster}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        </div>

        {/* Title & Metadata */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-red-400 transition-colors truncate">
            {event.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mt-1.5">
            <span className="flex items-center gap-1 font-mono text-gray-300">
              <Calendar className="w-3 h-3 text-red-400" />
              {event.date}
            </span>
            {event.time && (
              <span className="flex items-center gap-1 font-mono text-gray-400">
                <Clock className="w-3 h-3 text-red-400/70" />
                {event.time}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
            <MapPin className="w-3 h-3 text-red-500/70" />
            <span>{event.venue}</span>
          </div>
        </div>
      </div>

      {/* Right End: Circular Arrow Action Button ( -> ) */}
      <div className="sm:self-center self-end relative z-10 shrink-0">
        <Link
          to={`/events/${event.slug}`}
          className="w-11 h-11 rounded-full border border-white/20 group-hover:border-red-500/80 group-hover:bg-red-600/20 text-gray-400 group-hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
          title="View & Register"
        >
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
};

export default EventCard;
