import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ImpeccablesLogo } from '../common/ImpeccablesLogo';

export const CtaBannerSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="relative rounded-3xl bg-[#090910] border border-red-500/30 p-8 sm:p-12 lg:p-16 overflow-hidden shadow-[0_0_50px_rgba(255,30,56,0.15)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Background ambient lighting */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 bg-red-600/20 blur-3xl rounded-full" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 bg-red-800/15 blur-3xl rounded-full" />

        {/* Left Column: Heading & Button */}
        <div className="lg:col-span-7 flex flex-col items-start z-10">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-red-400 font-bold mb-3">
            BE A PART OF THE JOURNEY
          </span>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase leading-tight font-display">
            CREATE. COLLABORATE.{' '}
            <span className="text-red-500 drop-shadow-[0_0_25px_rgba(255,30,56,0.5)]">
              BELONG.
            </span>
          </h2>

          <p className="mt-4 text-sm sm:text-base text-gray-300 max-w-md leading-relaxed">
            Join a community that turns ideas into experiences.
          </p>

          <div className="mt-8">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-bold text-white bg-red-600 hover:bg-red-500 shadow-[0_0_25px_rgba(255,30,56,0.6)] hover:shadow-[0_0_35px_rgba(255,30,56,0.85)] transition-all cursor-pointer group"
            >
              <span>Join The Impeccables</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Right Column: 3D Winged Emblem Pedestal */}
        <div className="lg:col-span-5 flex items-center justify-center relative z-10">
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
            {/* Concentric Glowing Red Rings */}
            <div className="absolute inset-0 rounded-full border border-red-500/30 animate-pulse" />
            <div className="absolute inset-4 rounded-full border border-red-500/20 animate-spin" style={{ animationDuration: '20s' }} />
            <div className="absolute inset-8 rounded-full border border-red-500/40" />

            {/* Glowing Center Logo */}
            <div className="relative z-10 flex flex-col items-center">
              <ImpeccablesLogo className="w-32 h-28 sm:w-40 sm:h-36 drop-shadow-[0_0_35px_rgba(255,30,56,0.8)]" />
              {/* Metallic Base Rim */}
              <div className="w-48 h-4 rounded-full bg-gradient-to-r from-transparent via-red-600/60 to-transparent blur-sm -mt-2" />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default CtaBannerSection;
