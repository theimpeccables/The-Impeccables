import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { EventCard } from '../../components/cards/EventCard';
import { usePublicData, PublicDataState } from '../../hooks/usePublicData';

export const Events = () => {
  const [showAllEvents, setShowAllEvents] = useState(false);
  const { data, loading, error } = usePublicData('/events', { params: showAllEvents ? { limit: 50 } : { upcoming: true, limit: 50 } });
  const events = data.map((event) => {
    const date = event.date ? new Date(event.date) : null;
    return { ...event, id: event._id || event.slug, poster: event.posterImage, day: date ? String(date.getDate()).padStart(2, '0') : '', month: date?.toLocaleString('en', { month: 'short' }).toUpperCase() || '', date: date?.toLocaleDateString() || '', venue: event.venue || '', time: date?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '' };
  });
  return (
    <div className="public-page max-w-6xl mx-auto text-gray-100 flex flex-col">
      
      {/* Screen 05: Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-red-400 font-bold mb-2 block">
            UPCOMING EVENTS
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase leading-tight font-display">
            BIGGER EXPERIENCES{' '}
            <span className="text-red-500 drop-shadow-[0_0_25px_rgba(255,30,56,0.5)]">
              AHEAD
            </span>
          </h1>
        </div>

        <button
          onClick={() => setShowAllEvents((showAll) => !showAll)}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <span>{showAllEvents ? 'Upcoming Events' : 'View All Events'}</span>
          <ArrowRight className="w-3.5 h-3.5 text-red-500" />
        </button>
      </div>

      {/* Screen 05: Event Items Stack */}
      <PublicDataState loading={loading} error={error} empty={`There are no ${showAllEvents ? 'events' : 'upcoming events'} at the moment.`} isEmpty={events.length === 0}>
      <div className="space-y-4">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
      </PublicDataState>

    </div>
  );
};

export default Events;
