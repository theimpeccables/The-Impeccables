import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { APP_CONFIG } from '../../constants';
import heroBackground from '../../assets/hero-3d-installation.jpg';

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section
      className="home-hero relative isolate min-h-[max(100svh,640px)] overflow-hidden bg-[#050505]"
      style={{ backgroundImage: `url(${heroBackground})` }}
    >
      <div className="home-hero-shades pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="home-hero-copy absolute left-[6.2%] top-[31%] z-10 w-[min(43%,560px)]">
        <span className="mb-2 block font-inter text-[14px] tracking-[0.6em] text-white">T H E</span>
        <h1 className="home-display-title whitespace-nowrap text-white">
          <span className="home-brush-im">IM</span><span>PECCABLES</span>
        </h1>
        <p className="home-hero-tagline mt-4 font-inter text-white">{APP_CONFIG.tagline}</p>
        <p className="home-hero-description mt-5 max-w-[340px] font-inter">
          The Official Multidimensional Cultural Society of KIET — a space where ideas, art, expression and people come together to create experiences that stay.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/domains')}
            className="home-hero-primary inline-flex h-10 items-center gap-2.5 rounded-full bg-[#ff2a2a] px-5 font-inter text-[13px] font-semibold text-white transition hover:-translate-y-0.5"
          >
            Explore Our World <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate('/events')}
            className="home-hero-watch inline-flex h-10 items-center gap-2.5 rounded-full px-3 font-inter text-[13px] text-white transition hover:bg-white/[0.06]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-red-500 text-red-400">
              <Play className="ml-0.5 h-3 w-3 fill-current" />
            </span>
            Watch Intro
          </button>
        </div>
      </div>

      <aside className="home-hero-values absolute right-10 top-1/2 z-10 -translate-y-1/2 border-l border-[#ff2a2a] pl-4 font-inter text-white">
        {['ART', 'PEOPLE', 'IDEAS', 'CULTURE', 'EXPRESSION', 'COMMUNITY'].map((word) => <div key={word}>{word}</div>)}
      </aside>

      <div className="home-hero-scroll absolute bottom-6 right-10 z-10 flex items-center gap-3 font-inter text-white">
        <span className="home-hero-mouse relative flex h-8 w-5 items-start justify-center rounded-full border border-white/60 pt-[6px]">
          <span className="h-1 w-1 rounded-full bg-[#ff2a2a]" />
        </span>
        <span>SCROLL TO EXPLORE</span>
      </div>
    </section>
  );
};

export default HeroSection;
export { HeroSection };
