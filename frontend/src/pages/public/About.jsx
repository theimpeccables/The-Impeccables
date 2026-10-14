import React, { lazy, Suspense } from 'react';
import { Users, Layers, Sparkles, Infinity as InfinityIcon } from 'lucide-react';
const CircularPortal3D = lazy(() => import('../../components/3d/CircularPortal3D').then((module) => ({ default: module.CircularPortal3D })));
import { IMPACT_STATS } from '../../constants';

const statIcons = {
  Users: Users,
  Layers: Layers,
  Sparkles: Sparkles,
  Infinity: InfinityIcon,
};

export const About = () => {
  return (
    <div className="public-page max-w-7xl mx-auto text-gray-100 flex flex-col">
      
      {/* Screen 02: About Us Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side: Content & 4 Stat Cards */}
        <div className="lg:col-span-7 flex flex-col items-start">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-red-400 font-bold mb-3">
            ABOUT US
          </span>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight uppercase leading-tight font-display">
            MORE THAN{' '}
            <span className="text-red-500 drop-shadow-[0_0_30px_rgba(255,30,56,0.5)]">
              A CLUB
            </span>
          </h1>

          <p className="mt-6 text-sm sm:text-base text-gray-300 max-w-xl leading-relaxed">
            The Impeccables is a community of creators, thinkers and performers, bringing together different forms of art and expression to build a more vibrant, inclusive and creative campus.
          </p>

          {/* 4 Stat Boxes (Horizontal Grid) */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
            {IMPACT_STATS.map((stat, idx) => {
              const IconComp = statIcons[stat.icon] || Sparkles;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-[#0e0e16] border border-white/10 hover:border-red-500/40 transition-all shadow-lg flex flex-col items-start"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center mb-3">
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-white">
                    {stat.count}
                  </div>
                  <div className="text-xs font-semibold text-gray-300 mt-1 leading-snug">
                    {stat.label}
                  </div>
                  <div className="text-[11px] font-mono text-gray-500 mt-0.5">
                    {stat.subtext}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right Side: Dramatic 3D Archway Portal with Cursive Calligraphy */}
        <div className="lg:col-span-5 relative flex items-center justify-center">
          <div className="relative w-full max-w-[460px] aspect-[4/5] rounded-3xl overflow-hidden bg-[#0a0a10] border border-red-500/30 shadow-[0_0_40px_rgba(255,30,56,0.2)] flex items-center justify-center p-6">
            
            {/* Ambient Red Glow in Portal */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-red-950/60 via-transparent to-transparent" />
            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-red-600/20 blur-[100px] rounded-full" />

            {/* 3D Three.js Circular Portal Animation */}
            <div className="w-full h-full absolute inset-0 flex items-center justify-center">
              <Suspense fallback={<div className="h-full w-full animate-pulse bg-white/[.02]" />}><CircularPortal3D className="w-full h-full" /></Suspense>
            </div>

            {/* Handwritten cursive overlay as shown in mockup */}
            <div className="absolute top-8 right-8 z-20 text-right">
              <div className="text-2xl sm:text-3xl font-serif italic text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] font-light">
                Different <br />
                <span className="text-red-400">Domains.</span>
              </div>
              <div className="text-sm font-mono text-gray-400 mt-1 tracking-wider uppercase">
                One Community.
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};

export default About;
