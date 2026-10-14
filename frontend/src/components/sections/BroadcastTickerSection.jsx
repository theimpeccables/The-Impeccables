import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ANNOUNCEMENTS } from '../../constants';

export const BroadcastTickerSection = ({ items = ANNOUNCEMENTS }) => {
  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="p-8 rounded-3xl bg-gradient-to-br from-purple-950/40 via-[#0e0e18] to-cyan-950/30 border border-purple-500/20 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
            </span>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
              Official Broadcast Desk
            </h3>
          </div>
          <Link
            to="/announcements"
            className="text-xs text-purple-400 hover:text-purple-300 font-mono inline-flex items-center gap-1"
          >
            View All Notices <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {item.category}
                  </span>
                  <span className="text-xs font-mono text-gray-500">{item.date}</span>
                </div>
                <h4 className="text-sm font-semibold text-gray-200">{item.title}</h4>
                <p className="text-xs text-gray-400 mt-1">{item.summary}</p>
              </div>
              <div className="text-xs font-mono text-purple-400 shrink-0">
                {item.author}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BroadcastTickerSection;
