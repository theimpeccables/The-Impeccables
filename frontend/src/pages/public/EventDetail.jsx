import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, CalendarDays, MapPin, ExternalLink } from 'lucide-react';
import { usePublicData, PublicDataState } from '../../hooks/usePublicData';
import api, { apiErrorMessage } from '../../services/api';

export const EventDetail = () => {
  const { slug } = useParams();
  const { data: event, loading, error } = usePublicData(`/events/${slug}`, { initialValue: null });
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [slots, setSlots] = useState([]);
  const [volunteerMessage, setVolunteerMessage] = useState('');
  useEffect(() => {
    if (!event?._id) return undefined;
    let active = true;
    api.get(`/events/${event._id}/volunteer-slots`).then(({ data }) => { if (active) setSlots(data.data); }).catch(() => { if (active) setSlots([]); });
    return () => { active = false; };
  }, [event?._id]);
  const addToCalendar = () => {
    if (!event?.date) return;
    const start = new Date(event.date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const end = new Date(event.endDate || new Date(new Date(event.date).getTime() + 60 * 60 * 1000)).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const content = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Impeccables//Events//EN', 'BEGIN:VEVENT', `UID:${event.slug}@theimpeccables`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`, `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${event.title.replace(/[,;\\]/g, '\\$&')}`, `LOCATION:${(event.venue || '').replace(/[,;\\]/g, '\\$&')}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${event.slug}.ics`; anchor.click(); URL.revokeObjectURL(url);
  };
  return <main className="public-page event-detail-page max-w-5xl mx-auto text-gray-100">
    <Link to="/events" className="mb-8 inline-flex items-center gap-2 text-sm text-red-300"><ArrowLeft size={16} /> All events</Link>
    <PublicDataState loading={loading} error={error} empty="This event is not available." isEmpty={!event}>
      <article className="event-detail-card overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        {event?.posterImage && <img src={event.posterImage} alt="" className="max-h-[460px] w-full object-cover" />}
        <div className="p-6 sm:p-10">
          <p className="text-xs uppercase tracking-[.2em] text-red-300">{event?.eventType}</p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">{event?.title}</h1>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-300">
            {event?.date && <span className="inline-flex items-center gap-2"><CalendarDays size={16} />{new Date(event.date).toLocaleString()}</span>}
            {event?.venue && <span className="inline-flex items-center gap-2"><MapPin size={16} />{event.venue}</span>}
          </div>
          <p className="mt-6 whitespace-pre-line leading-7 text-gray-300">{event?.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {event?.date && <button onClick={addToCalendar} className="rounded-full border border-white/20 px-5 py-3 text-sm hover:border-red-400">Add to calendar</button>}
            {event?.registrationLink && <a href={event.registrationLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm text-white">Register <ExternalLink size={15} /></a>}
          </div>
          {slots.length > 0 && <section className="mt-10 border-t border-white/10 pt-7">
            <h2 className="text-xl font-semibold text-white">Volunteer shifts</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">{slots.map((slot) => <div key={slot._id} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <h3 className="font-semibold text-white">{slot.title}</h3><p className="mt-1 text-xs text-gray-400">{new Date(slot.startsAt).toLocaleString()} – {new Date(slot.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="mt-1 text-xs text-gray-400">{Math.max(0, slot.capacity - slot.reservedCount)} places remaining</p>
              {isAuthenticated && <button disabled={slot.reservedCount >= slot.capacity} onClick={async () => { try { await api.post(`/volunteer-slots/${slot._id}/signup`); setVolunteerMessage('You are signed up for this shift.'); setSlots((current) => current.map((item) => item._id === slot._id ? { ...item, reservedCount: item.reservedCount + 1 } : item)); } catch (signupError) { setVolunteerMessage(apiErrorMessage(signupError, 'Unable to sign up for this shift.')); } }} className="mt-3 rounded-full bg-red-600 px-4 py-2 text-xs text-white disabled:opacity-50">Sign up</button>}
            </div>)}</div>
            {volunteerMessage && <p className="mt-3 text-sm text-gray-300" role="status">{volunteerMessage}</p>}
            {!isAuthenticated && <p className="mt-3 text-xs text-gray-400"><Link to="/login" className="text-red-300">Sign in</Link> to volunteer for a shift.</p>}
          </section>}
        </div>
      </article>
    </PublicDataState>
  </main>;
};

export default EventDetail;
