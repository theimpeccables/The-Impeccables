import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowUp } from 'lucide-react';
import { ImpeccablesLogo } from '../common/ImpeccablesLogo';
import { InstagramIcon, YoutubeIcon, LinkedinIcon } from '../ui/SocialIcons';
import { NAV_LINKS, APP_CONFIG } from '../../constants';

export const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative border-t border-white/[0.08] bg-[#050508] text-gray-400 overflow-hidden">
      {/* Background ambient red glow */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[250px] bg-red-600/10 blur-[150px] rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        
        {/* Main Footer Row (as in Panel 08) */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-10 border-b border-white/5">
          
          {/* Left: Logo & Brand Tagline */}
          <div className="flex items-center gap-3">
            <ImpeccablesLogo className="w-8 h-7" />
            <div>
              <div className="text-sm font-black tracking-tight text-white uppercase">
                THE IMPECCABLES
              </div>
              <div className="text-[11px] font-mono text-gray-500">
                {APP_CONFIG.tagline}
              </div>
            </div>
          </div>

          {/* Center: Navigation Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-gray-400">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="hover:text-white transition-colors"
              >
                {link.name}
              </Link>
            ))}
            <Link to="/contact" className="hover:text-white transition-colors">
              Contact
            </Link>
          </nav>

          {/* Right: Social Icons */}
          <div className="flex items-center gap-3">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-600/20 hover:text-red-400 border border-white/10 flex items-center justify-center transition-all"
              title="Instagram"
            >
              <InstagramIcon className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-600/20 hover:text-red-400 border border-white/10 flex items-center justify-center transition-all"
              title="YouTube"
            >
              <YoutubeIcon className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-600/20 hover:text-red-400 border border-white/10 flex items-center justify-center transition-all"
              title="LinkedIn"
            >
              <LinkedinIcon className="w-3.5 h-3.5" />
            </a>
            <a
              href="mailto:contact@theimpeccables.org"
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-600/20 hover:text-red-400 border border-white/10 flex items-center justify-center transition-all"
              title="Email"
            >
              <Mail className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>

        {/* Bottom Bar: Copyright | Designed with ♥ | Back to Top */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-gray-500">
          <div>
            © 2026 The Impeccables. All Rights Reserved.
          </div>

          <div>
            Designed with <span className="text-red-500">♥</span> for creators.
          </div>

          <button
            onClick={scrollToTop}
            className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <span>Back to Top</span>
            <ArrowUp className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
