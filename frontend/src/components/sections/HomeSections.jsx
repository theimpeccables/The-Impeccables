import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  Camera,
  Clapperboard,
  Feather,
  Laugh,
  Mic2,
  PanelsTopLeft,
  Palette,
  Plus,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { IMPACT_STATS } from '../../constants';
import { usePublicData } from '../../hooks/usePublicData';
import frameDancer from '../../assets/home/frame-dancer.png';
import frameCamera from '../../assets/home/frame-camera.png';
import frameSinger from '../../assets/home/frame-singer.png';

const DOMAIN_ICONS = [Palette, UsersRound, Feather, Camera, Mic2, Clapperboard, Laugh, Clapperboard, PanelsTopLeft];

const useScrollReveal = () => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, isVisible];
};

const Reveal = ({ children, className = '' }) => {
  const [ref, isVisible] = useScrollReveal();
  return <div ref={ref} className={`home-reveal ${isVisible ? 'is-visible' : ''} ${className}`}>{children}</div>;
};

const SectionTitle = ({ eyebrow, children, accent }) => (
  <div className="mb-7">
    <span className="home-eyebrow">{eyebrow}</span>
    <h2 className="home-section-title mt-1">
      {children}{accent && <> <span>{accent}</span></>}
    </h2>
  </div>
);

const AnimatedStat = ({ stat, index }) => {
  const ref = useRef(null);
  const target = Number.parseInt(stat.count, 10);
  const isInfinity = stat.count.includes('∞');
  const supportsIntersectionObserver = typeof window !== 'undefined' && 'IntersectionObserver' in window;
  const [value, setValue] = useState(isInfinity ? '∞' : supportsIntersectionObserver ? '0+' : stat.count);

  useEffect(() => {
    const node = ref.current;
    if (!node || isInfinity || !supportsIntersectionObserver) return undefined;
    let frameId;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / 1000, 1);
        const eased = 1 - (1 - progress) ** 3;
        setValue(`${Math.round(target * eased)}+`);
        if (progress < 1) frameId = requestAnimationFrame(tick);
      };
      frameId = requestAnimationFrame(tick);
      observer.disconnect();
    }, { threshold: 0.4 });
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [isInfinity, supportsIntersectionObserver, target]);

  return (
    <div ref={ref} className="home-stat-card" style={{ transitionDelay: `${index * 70}ms` }}>
      <strong>{value}</strong>
      <span>{stat.label}</span>
      <small>{stat.subtext}</small>
    </div>
  );
};

export const HomeAboutSection = () => (
  <section className="home-section home-about" id="about">
    <Reveal className="home-section-inner grid items-center gap-8 xl:grid-cols-[1fr_0.9fr_1fr] xl:gap-10">
      <div>
        <SectionTitle eyebrow="ABOUT US" accent="CLUB">MORE THAN A</SectionTitle>
        <p className="max-w-lg text-sm leading-7 text-gray-300 sm:text-base">
          The Impeccables is a community of creators, thinkers and performers, bringing together different forms of art and expression to build a more vibrant, inclusive and creative campus.
        </p>
        <a href="/about" className="home-text-link mt-6 inline-flex items-center gap-2">
          Discover our story <ArrowRight className="h-4 w-4" />
        </a>
      </div>

      <div className="home-about-collage relative mx-auto h-[270px] w-full max-w-[360px] sm:h-[330px]" aria-hidden="true">
        <div className="home-collage-glow" />
        <img src={frameCamera} alt="" className="home-collage-frame home-collage-frame-back" />
        <img src={frameDancer} alt="" className="home-collage-frame home-collage-frame-main" />
        <img src={frameSinger} alt="" className="home-collage-frame home-collage-frame-front" />
        <span className="home-script-note">Different domains.<br /><b>One community.</b></span>
      </div>

      <div className="home-stats-grid grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 shadow-[0_18px_60px_rgba(0,0,0,.34)] backdrop-blur-xl sm:gap-4 sm:p-5">
        {IMPACT_STATS.map((stat, index) => <AnimatedStat key={stat.label} stat={stat} index={index} />)}
      </div>
    </Reveal>
  </section>
);

export const HomeDomainsSection = () => {
  const navigate = useNavigate();
  const { data: domains } = usePublicData('/domains');
  const railRef = useRef(null);
  const moveRail = (direction) => railRef.current?.scrollBy({ left: direction * 300, behavior: 'smooth' });

  return (
    <section className="home-section" id="domains">
      <Reveal className="home-section-inner">
        <div className="mb-6 flex items-end justify-between gap-4">
          <SectionTitle eyebrow="OUR DOMAINS" accent="DIMENSIONS">EXPLORE OUR</SectionTitle>
          <div className="mb-7 flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => moveRail(-1)} className="home-carousel-arrow" aria-label="Scroll domains left"><ArrowLeft /></button>
            <button type="button" onClick={() => moveRail(1)} className="home-carousel-arrow" aria-label="Scroll domains right"><ArrowRight /></button>
          </div>
        </div>
        <div ref={railRef} className="home-domain-rail flex gap-4 overflow-x-auto pb-4" aria-label="Creative domains">
          {domains.map((domain, index) => {
            const Icon = DOMAIN_ICONS[index] || Sparkles;
            return (
              <button
                type="button"
                key={domain.id}
                onClick={() => navigate(`/domains/${domain.slug}`)}
                className="home-domain-card group shrink-0"
              >
                <span className="home-domain-icon"><Icon strokeWidth={1.35} /></span>
                <span className="home-domain-name">{domain.name}</span>
                <span className="home-domain-open"><ArrowDownRight className="h-4 w-4" /></span>
              </button>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
};

export const HomeGalleryEventsSection = () => {
  const navigate = useNavigate();
  const { data: postRecords } = usePublicData('/posts', { params: { featured: true, limit: 10 } });
  const { data: eventRecords } = usePublicData('/events', { params: { upcoming: true, limit: 2 } });
  const posts = postRecords.map((post) => ({ ...post, id: post._id, mediaUrl: post.media?.[0]?.url, domainName: post.domain?.name || '' }));
  const upcomingEvents = eventRecords.map((event) => {
    const date = event.date ? new Date(event.date) : null;
    return { ...event, id: event._id, poster: event.posterImage, day: date ? String(date.getDate()).padStart(2, '0') : '', month: date?.toLocaleString('en', { month: 'short' }).toUpperCase() || '', date: date?.toLocaleDateString() || '', venue: event.venue || '', time: date?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '' };
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const activePost = posts.length ? posts[activeIndex % posts.length] : null;
  const changePost = (direction) => {
    if (!posts.length) return;
    setActiveIndex((index) => (index + direction + posts.length) % posts.length);
  };

  return (
    <section className="home-section" id="gallery-events">
      <Reveal className="home-section-inner grid gap-9 lg:grid-cols-[1.1fr_1px_0.9fr] lg:gap-8">
        <div className="min-w-0">
          <div className="flex items-end justify-between gap-3">
            <SectionTitle eyebrow="FEATURED GALLERY" accent="US">MOMENTS THAT DEFINE</SectionTitle>
            <div className="mb-7 flex shrink-0 gap-2">
              <button type="button" onClick={() => changePost(-1)} className="home-carousel-arrow" aria-label="Previous gallery image"><ArrowLeft /></button>
              <button type="button" onClick={() => changePost(1)} className="home-carousel-arrow" aria-label="Next gallery image"><ArrowRight /></button>
            </div>
          </div>
          {activePost ? (
            <button type="button" className="home-featured-post group" onClick={() => navigate('/gallery')}>
              <img src={activePost.mediaUrl} alt={activePost.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <span className="home-post-shade" />
              <span className="home-post-caption">
                <small>{activePost.domainName}</small>
                <strong>{activePost.title}</strong>
              </span>
            </button>
          ) : (
            <div className="home-empty-media">Gallery moments are coming soon.</div>
          )}
          <div className="mt-3 flex justify-center gap-2">
            {posts.slice(0, Math.min(posts.length, 5)).map((post, index) => (
              <button key={post.id} type="button" onClick={() => setActiveIndex(index)} className={`home-gallery-dot ${index === activeIndex % Math.max(posts.length, 1) ? 'active' : ''}`} aria-label={`Show gallery item ${index + 1}`} />
            ))}
          </div>
        </div>

        <div className="hidden bg-gradient-to-b from-transparent via-white/15 to-transparent lg:block" />

        <div className="min-w-0">
          <div className="flex items-end justify-between gap-3">
            <SectionTitle eyebrow="UPCOMING EVENTS" accent="AHEAD">BIGGER EXPERIENCES</SectionTitle>
            <button type="button" onClick={() => navigate('/events')} className="home-text-link mb-7 shrink-0">All events <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="space-y-3">
            {upcomingEvents.slice(0, 2).map((event) => (
              <button type="button" key={event.id} onClick={() => navigate('/events')} className="home-event-card group">
                <span className="home-event-date"><b>{event.day || '02'}</b><small>{event.month || 'APR'}</small></span>
                <img src={event.poster} alt="" className="home-event-poster" />
                <span className="min-w-0 flex-1 text-left">
                  <strong className="block truncate text-sm font-semibold text-white sm:text-base">{event.title}</strong>
                  <small className="mt-1 block text-xs text-gray-400">{event.date}{event.time ? ` · ${event.time}` : ''}</small>
                  <small className="mt-1 block truncate text-xs text-gray-500">{event.venue}</small>
                </span>
                <span className="home-event-arrow"><ArrowRight className="h-4 w-4" /></span>
              </button>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
};

export const HomeTeamCtaSection = () => {
  const navigate = useNavigate();
  const { data: teamMembers } = usePublicData('/team');
  return (
    <section className="home-section home-team-section" id="team">
      <Reveal className="home-section-inner grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <SectionTitle eyebrow="MEET THE TEAM" accent="MAGIC">THE PEOPLE BEHIND THE</SectionTitle>
          <div className="flex flex-wrap items-start gap-x-6 gap-y-5">
            {teamMembers.slice(0, 4).map((member) => (
              <button key={member.id} type="button" onClick={() => navigate('/team')} className="home-team-member">
                <span className="home-team-photo-ring"><img src={member.image} alt={member.name} /></span>
                <span className="mt-2 text-xs font-semibold text-gray-200">{member.name}</span>
              </button>
            ))}
            <button type="button" onClick={() => navigate('/team')} className="home-team-member group">
              <span className="home-team-more"><Plus className="h-8 w-8 transition-transform group-hover:rotate-90" /></span>
              <span className="mt-2 text-xs font-semibold text-gray-200">View Full Team</span>
            </button>
          </div>
        </div>

        <div className="home-cta-block">
          <h2 className="home-section-title">CREATE. COLLABORATE.<br /><span>BELONG.</span></h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-gray-400">Join a community that turns ideas into experiences.</p>
          <button type="button" onClick={() => navigate('/login')} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#ff202a] px-6 py-3 text-sm font-semibold text-white shadow-[0_0_26px_rgba(255,35,42,.3)] transition hover:-translate-y-0.5 hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
            Join The Impeccables <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </Reveal>
    </section>
  );
};
