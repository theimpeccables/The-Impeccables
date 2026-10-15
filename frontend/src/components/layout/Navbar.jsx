import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleMobileNav, setMobileNavOpen } from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';
import { Search, Menu, X, LayoutDashboard, LogOut, ArrowLeft } from 'lucide-react';
import { ImpeccablesLogo } from '../common/ImpeccablesLogo';
import { NAV_LINKS } from '../../constants';
import { cn } from '../../utils/cn';
import api, { clearAccessToken } from '../../services/api';

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const isMobileNavOpen = useSelector((state) => state.ui.isMobileNavOpen);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const isHome = location.pathname === '/';
  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { /* Clear the local session even if the API is unreachable. */ }
    clearAccessToken();
    dispatch(logout());
    navigate('/', { replace: true });
  };
  const goBack = () => {
    if (Number.isInteger(window.history.state?.idx) && window.history.state.idx > 0) navigate(-1);
    else navigate('/', { replace: true });
  };

  return (
    <header className={cn(
      'public-navbar z-50 w-full transition-all',
      isHome
        ? 'home-navbar absolute inset-x-0 top-5 border-0 bg-transparent'
        : 'sticky top-0 border-b border-white/[0.08] bg-[#060608]/90 backdrop-blur-2xl'
    )}>
      <div className={cn(
        'mx-auto px-4 sm:px-6 lg:px-8',
        isHome
          ? 'w-[90%] max-w-[1600px] rounded-[24px] border border-white/10 bg-[rgba(10,10,10,0.55)] backdrop-blur-[14px]'
          : 'max-w-7xl'
      )}>
        <div className={cn(
          'flex items-center justify-between',
          isHome ? 'min-h-[3.5rem] gap-3 py-2 sm:min-h-[3.75rem]' : 'min-h-[4rem] py-2'
        )}>
          
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {!isHome && <button type="button" onClick={goBack} aria-label="Go back" title="Go back" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[.04] text-gray-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50">
              <ArrowLeft className="h-4 w-4" />
            </button>}
            <Link
              to="/"
              onClick={() => dispatch(setMobileNavOpen(false))}
              className="group flex select-none items-center gap-3"
            >
              <ImpeccablesLogo className="h-8 w-9 shrink-0 transition-transform group-hover:scale-105 sm:h-9 sm:w-10" />
              <span className={cn(
                'whitespace-nowrap transition-colors group-hover:text-red-400',
                isHome
                  ? 'text-[10px] font-medium tracking-[0.08em] text-white sm:text-[11px]'
                  : 'text-xs font-black uppercase tracking-tight text-white sm:text-sm'
              )}>
                {isHome ? <>THE <strong className="font-black">IMPECCABLES</strong></> : 'THE IMPECCABLES'}
              </span>
            </Link>
          </div>

          {/* Center Navigation Pill Bar */}
          <nav className={cn(
            'hidden items-center gap-1 lg:flex',
            isHome ? 'flex-1 justify-center' : 'gap-1 rounded-full border border-red-500/20 bg-[#09090b]/45 px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.32)] backdrop-blur-xl'
          )}>
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.path ||
                (link.path !== '/' && location.pathname.startsWith(`${link.path}/`));
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    isHome
                      ? 'relative whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-semibold tracking-wide transition-all duration-200 select-none xl:px-4 xl:text-xs'
                      : 'relative rounded-full px-4 py-2 text-[11px] xl:text-xs font-semibold tracking-wide transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                    isHome
                      ? isActive
                        ? 'border border-[rgba(255,60,60,0.5)] bg-[rgba(255,40,40,0.25)] text-white'
                        : 'border border-transparent text-gray-300 hover:text-white'
                      : isActive
                        ? 'border border-red-500/40 bg-red-600/20 text-white shadow-[0_0_18px_rgba(255,30,56,0.22)]'
                        : 'border border-transparent text-gray-300 hover:text-white hover:bg-white/[0.05]'
                  )}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="hidden shrink-0 items-center gap-3 lg:flex">
            {/* Search Trigger */}
            <button
              onClick={() => navigate('/gallery')}
              className="rounded-full p-2 text-gray-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              title="Search gallery & content"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Auth / Login Button */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(255,30,56,0.5)] transition-all"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-400 rounded-full hover:bg-white/5 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="cursor-pointer rounded-full border border-red-500/75 bg-black/25 px-5 py-2 text-xs font-bold text-white shadow-[0_0_18px_rgba(255,30,56,0.22)] transition-all hover:bg-red-600/20 hover:shadow-[0_0_25px_rgba(255,30,56,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Login
              </button>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => dispatch(toggleMobileNav())}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white"
              aria-label="Toggle mobile menu"
            >
              {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileNavOpen && (
          <div className="lg:hidden border-b border-white/10 bg-[#060608]/98 backdrop-blur-3xl px-4 pt-3 pb-6 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3 px-2 py-2 mb-3 pb-3 border-b border-white/10">
            <ImpeccablesLogo className="w-8 h-7" />
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-wider text-white">THE IMPECCABLES</span>
              <span className="text-[10px] font-mono text-gray-400">KIET Cultural Society</span>
            </div>
          </div>
          <nav className="flex flex-col gap-1.5">
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.path ||
                (link.path !== '/' && location.pathname.startsWith(`${link.path}/`));
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => dispatch(setMobileNavOpen(false))}
                  className={cn(
                    'px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between',
                    isActive
                      ? 'text-white bg-red-600/20 border border-red-500/40'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  )}
                >
                  {link.name}
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-3">
            {isAuthenticated ? (
              <button
                onClick={() => {
                  dispatch(setMobileNavOpen(false));
                  navigate('/dashboard');
                }}
                className="w-full py-2.5 rounded-full text-xs font-bold text-white bg-red-600"
              >
                Go to Dashboard
              </button>
            ) : (
              <button
                onClick={() => {
                  dispatch(setMobileNavOpen(false));
                  navigate('/login');
                }}
                className="w-full py-2.5 rounded-full text-xs font-bold text-white border border-red-500 bg-red-600/20"
              >
                Login
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
