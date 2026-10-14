import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
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
  UserRound,
  CalendarDays,
} from 'lucide-react';
import { ImpeccablesLogo } from '../common/ImpeccablesLogo';
import NotificationBell from './NotificationBell';
import { Avatar, AvatarFallback, AvatarImage, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/Primitives';
import { cn } from '../../utils/cn';
import api, { clearAccessToken } from '../../services/api';

export const DashboardLayout = () => {
  const location = useLocation();
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

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['member', 'domain_admin', 'admin', 'super_admin'],
    },
    { name: 'Meetings', path: '/dashboard/attendance', icon: CalendarCheck, roles: ['member', 'domain_admin', 'admin', 'super_admin'] },
    { name: 'Events', path: '/events', icon: CalendarDays, roles: ['member', 'domain_admin', 'admin', 'super_admin'] },
    { name: 'Groups', path: '/dashboard/groups', icon: Users, roles: ['member', 'domain_admin', 'admin', 'super_admin'] },
    { name: 'Profile', path: '/dashboard/profile', icon: UserRound, roles: ['member', 'domain_admin', 'admin', 'super_admin'] },
    {
      name: 'Approvals',
      path: '/dashboard/approvals',
      icon: CheckSquare,
      badge: pendingApprovalsCount,
      roles: ['domain_admin', 'admin', 'super_admin'],
    },
    { name: 'Events', path: '/dashboard/content', icon: Megaphone, roles: ['admin', 'super_admin'] },
    { name: 'Tasks', path: '/dashboard/tasks', icon: ListTodo, roles: ['member', 'domain_admin', 'admin', 'super_admin'] },
    {
      name: 'Leadership',
      path: '/dashboard/admin',
      icon: Megaphone,
      roles: ['admin', 'super_admin'],
    },
    {
      name: 'Members',
      path: '/dashboard/members',
      icon: Users,
      roles: ['admin', 'super_admin'],
    },
    { name: 'Audit history', path: '/dashboard/audit', icon: Shield, roles: ['super_admin'] },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings, roles: ['domain_admin', 'admin', 'super_admin'] },
  ];

  const authorizedNavItems = navItems.filter((item) => item.roles.includes(role) && !(role === 'member' && ['Approvals', 'Tasks', 'Events'].includes(item.name) && item.path !== '/events'));

  return (
    <div className="min-h-screen bg-[#07070a] text-gray-100 flex flex-col lg:flex-row">
      
      {/* ==========================================================
          SIDEBAR NAVIGATION
          ========================================================== */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-[#0c0c14] border-r border-white/10 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div>
          {/* Logo */}
          <div className="h-20 px-6 border-b border-white/10 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <ImpeccablesLogo className="w-10 h-8 shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-white">THE IMPECCABLES</span>
                <span className="text-[9px] font-mono uppercase tracking-widest text-red-400">Portal v2.0</span>
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
          <div className="p-4 space-y-1.5">
            <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-gray-500">
              Workspace
            </div>

            {authorizedNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group',
                    isActive
                      ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn('w-4 h-4', isActive ? 'text-purple-400' : 'text-gray-400 group-hover:text-purple-300')} />
                    <span>{item.name}</span>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="pt-4 mt-4 border-t border-white/5">
              <Link
                to="/"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-cyan-400" />
                <span>View Public Website</span>
              </Link>
            </div>
          </div>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-white/10 bg-[#09090f]">
          <div className="flex items-center gap-3 mb-3">
              <img
              src={user?.profilePhoto || user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
              alt={user?.name || 'User'}
              className="w-10 h-10 rounded-xl object-cover border border-purple-400/30 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">{user?.name || 'Member'}</div>
              <div className="text-[10px] font-mono text-purple-400 capitalize truncate">
                {role.replace('_', ' ')}
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
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        
        {/* Top bar */}
        <header className="h-20 border-b border-white/10 bg-[#07070a]/80 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <ImpeccablesLogo className="w-7 h-6 shrink-0" />
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
              <span className="hidden sm:inline">The Impeccables</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-600 hidden sm:inline" />
              <span className="text-white capitalize">{location.pathname.replace('/dashboard', '') || 'Overview'}</span>
            </div>
          </div>

          {/* Quick Role Preview Pill */}
          <div className="flex items-center gap-3"><NotificationBell />
            <DropdownMenu><DropdownMenuTrigger aria-label="Open profile menu" className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#ff2a2a]/50"><Avatar className="h-10 w-10 border border-white/15"><AvatarImage src={user?.profilePhoto || user?.avatar || undefined} alt={user?.name || 'Profile'} /><AvatarFallback>{user?.firstName?.[0] || user?.name?.[0] || 'U'}</AvatarFallback></Avatar></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuItem asChild><Link to="/dashboard/profile"><UserRound size={15} /> View Profile</Link></DropdownMenuItem><DropdownMenuItem asChild><Link to="/dashboard/settings"><Settings size={15} /> Settings</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={(event) => { event.preventDefault(); handleLogout(); }} className="text-red-200 focus:text-red-100"><LogOut size={15} /> Logout</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
          </div>
        </header>

        {/* Child Page Output */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

    </div>
  );
};

export default DashboardLayout;
