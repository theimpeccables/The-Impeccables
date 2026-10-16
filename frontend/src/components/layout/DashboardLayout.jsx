import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { logout } from '../../store/slices/authSlice';
import { notify } from '../../utils/notify';
import {
  LayoutDashboard,
  CheckSquare,
  CalendarCheck,
  Megaphone,
  LogOut,
  Shield,
  Menu,
  X,
  ChevronRight,
  ExternalLink,
  Users,
  ListTodo,
  Settings,
  ArrowLeft,
  Cake,
} from 'lucide-react';
import { ImpeccablesLogo } from '../common/ImpeccablesLogo';
import NotificationBell from './NotificationBell';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/Primitives';
import { UserAvatar } from '../ui/DesignPrimitives';
import { cn } from '../../utils/cn';
import api, { clearAccessToken } from '../../services/api';

export const DashboardLayout = () => {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user, role } = useSelector((state) => state.auth);
  const submissions = useSelector((state) => state.posts.submissions);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Calculate pending items for domain admin
  const pendingApprovalsCount = submissions.filter((s) => s.status === 'under_review').length;

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { /* Clear the local session even if the API is unreachable. */ }
    clearAccessToken();
    dispatch(logout());
    notify({
        type: 'info',
        title: 'Logged Out',
        message: 'You have exited the member management portal.',
    });
    navigate('/');
  };
  const goBack = () => {
    if (Number.isInteger(window.history.state?.idx) && window.history.state.idx > 0) navigate(-1);
    else navigate('/dashboard');
  };

  const navGroups = [
    { heading: 'Member', items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['member', 'domain_admin', 'admin', 'super_admin'] },
      { name: 'Meetings', path: '/dashboard/attendance', icon: CalendarCheck, roles: ['member', 'domain_admin', 'admin', 'super_admin'] },
      { name: 'Tasks', path: '/dashboard/tasks', icon: ListTodo, roles: ['member', 'domain_admin', 'admin', 'super_admin'] },
      { name: 'Groups', path: '/dashboard/groups', icon: Users, roles: ['member', 'domain_admin', 'admin', 'super_admin'] },
      { name: 'Announcements', path: '/announcements', icon: Megaphone, roles: ['member', 'domain_admin', 'admin', 'super_admin'] },
      { name: 'Settings', path: '/dashboard/settings', icon: Settings, roles: ['member', 'domain_admin', 'admin', 'super_admin'] },
    ] },
    { heading: 'Manage', items: [
      { name: 'Approvals', path: '/dashboard/approvals', icon: CheckSquare, badge: pendingApprovalsCount, roles: ['domain_admin', 'admin', 'super_admin'] },
      { name: 'Content', path: '/dashboard/content', icon: Megaphone, roles: ['admin', 'super_admin'] },
      { name: 'Birthdays', path: '/automation/birthdays', icon: Cake, roles: ['admin', 'super_admin'] },
    ] },
    { heading: 'Admin', items: [
      { name: 'Members', path: '/dashboard/members', icon: Users, roles: ['admin', 'super_admin'] },
      { name: 'Audit history', path: '/dashboard/audit', icon: Shield, roles: ['super_admin'] },
    ] },
  ];
  const visibleGroups = navGroups.map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(role)) })).filter((group) => group.items.length);
  const routeLabels = { '/dashboard': 'Dashboard', '/dashboard/attendance': 'Meetings', '/dashboard/tasks': 'Tasks', '/dashboard/groups': 'Groups', '/dashboard/approvals': 'Approvals', '/dashboard/content': 'Content', '/dashboard/audit': 'Audit History', '/dashboard/settings': 'Settings', '/dashboard/members': 'Members', '/dashboard/submit': 'Submit Work', '/dashboard/notifications': 'Notifications' };
  const activeItem = navGroups.flatMap((group) => group.items).find((item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`));
  const pageName = routeLabels[location.pathname] || activeItem?.name || (location.pathname.startsWith('/meetings/') ? 'Meeting details' : location.pathname.startsWith('/tasks/') ? 'Task details' : 'Dashboard');
  const pageMotion = reduceMotion ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 0 }, transition: { duration: 0.2 } };

  return (
    <div className="min-h-screen bg-[#07070a] text-gray-100 flex flex-col lg:flex-row">
      
      {/* ==========================================================
          SIDEBAR NAVIGATION
          ========================================================== */}
      <aside
        className={cn(
          'dashboard-sidebar fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col justify-between border-r border-white/10 transition-transform duration-300 lg:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div>
          {/* Logo */}
          <div className="h-[68px] border-b border-white/[.07] px-5 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <ImpeccablesLogo className="h-8 w-9 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold tracking-wide text-white">THE IMPECCABLES</span>
                <span className="text-[8px] font-semibold uppercase tracking-[.2em] text-red-400">Portal</span>
              </div>
            </Link>

            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-4 px-3 py-4">
            {visibleGroups.map((group) => <section key={group.heading}>
              <h2 className="px-3 pb-1.5 text-[9px] font-semibold uppercase tracking-[.2em] text-gray-600">{group.heading}</h2>
              <div className="space-y-1">{group.items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    'dashboard-nav-link flex items-center justify-between rounded-xl px-3 py-2 text-[12px] font-medium transition-all group',
                    isActive
                      ? 'is-active border border-red-500/35 bg-red-600/15 text-white shadow-[0_0_18px_rgba(255,42,42,.12)]'
                      : 'border border-transparent text-gray-400 hover:bg-white/[.04] hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn('h-4 w-4', isActive ? 'text-red-300' : 'text-gray-500 group-hover:text-red-300')} />
                    <span>{item.name}</span>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                      <span className="rounded-full border border-red-500/25 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-200">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}</div>
            </section>)}
            <div className="border-t border-white/[.07] pt-3"><Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-gray-400 transition-colors hover:bg-white/[.04] hover:text-white"><ExternalLink className="h-4 w-4 text-red-300" /><span>View Public Website</span></Link></div>
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="border-t border-white/[.07] bg-black/20 p-3">
          <div className="flex items-center gap-3 rounded-xl p-2">
              <UserAvatar user={user} className="h-9 w-9 shrink-0 border-red-500/30" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-white">{user?.name || 'Member'}</div>
              <div className="truncate text-[10px] capitalize text-red-300">
                {String(role || 'member').replaceAll('_', ' ')}
              </div>
            </div>
          </div>

        </div>
      </aside>

      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ==========================================================
          MAIN CONTENT AREA
          ========================================================== */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[248px]">
        
        {/* Top bar */}
        <header className="dashboard-topbar sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-white/[.07] px-4 backdrop-blur-xl sm:px-7">
          <div className="flex items-center gap-4">
            <button type="button" onClick={goBack} aria-label="Go back" title="Go back" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[.04] text-gray-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <ImpeccablesLogo className="w-7 h-6 shrink-0" />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="hidden sm:inline">Home</span>
              <ChevronRight className="hidden h-3.5 w-3.5 text-gray-700 sm:inline" />
              <span className="text-gray-200">{pageName}</span>
            </div>
          </div>

          {/* Quick Role Preview Pill */}
          <div className="flex items-center gap-2.5"><NotificationBell />
            <DropdownMenu><DropdownMenuTrigger aria-label="Open account menu" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-red-400/25 bg-white/[.04] p-0.5 shadow-[0_0_16px_rgba(255,42,42,.08)] outline-none transition hover:border-red-400/50 hover:shadow-[0_0_20px_rgba(255,42,42,.18)] focus-visible:ring-2 focus-visible:ring-red-500/50"><UserAvatar user={user} className="h-full w-full border-red-300/25" /></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuItem asChild><Link to="/dashboard/settings"><Settings size={15} /> Settings</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={(event) => { event.preventDefault(); handleLogout(); }} className="text-red-200 focus:text-red-100"><LogOut size={15} /> Logout</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
          </div>
        </header>

        {/* Child Page Output */}
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6 xl:p-8">
          <AnimatePresence mode="wait" initial={false}><motion.div key={location.pathname} {...pageMotion}><Outlet /></motion.div></AnimatePresence>
        </main>
      </div>

    </div>
  );
};

export default DashboardLayout;
