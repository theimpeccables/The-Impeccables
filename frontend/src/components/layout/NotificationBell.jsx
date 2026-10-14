import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as Popover from '@radix-ui/react-popover';
import { Bell, CheckCheck, CalendarDays, CheckCircle2, Info, UserPlus, XCircle, Users, Sparkles, ClipboardList } from 'lucide-react';
import api from '../../services/api';
import { ScrollArea } from '../ui/Primitives';
import { Skeleton } from '../ui/Primitives';

const relativeTime = (date) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
};
const TypeIcon = ({ type }) => {
  const normalized = String(type || '').toLowerCase();
  const Icon = normalized === 'meeting' || normalized === 'attendance' ? CalendarDays
    : normalized === 'join_request' ? UserPlus
      : normalized === 'approved' || normalized === 'approval' ? CheckCircle2
        : normalized.startsWith('task') ? ClipboardList
        : normalized === 'rejected' ? XCircle
          : normalized === 'group_added' ? Users
            : normalized === 'event' ? Sparkles
              : normalized === 'system' ? Info : Bell;
  return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff2a2a]/[.15] text-red-300"><Icon size={15} /></span>;
};

const NotificationBell = () => {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [pulse, setPulse] = useState(false);
  const previousUnread = useRef(0);
  useEffect(() => {
    if (unread > previousUnread.current) {
      setPulse(true);
      const timeout = window.setTimeout(() => setPulse(false), 850);
      previousUnread.current = unread;
      return () => window.clearTimeout(timeout);
    }
    previousUnread.current = unread;
  }, [unread]);
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications', { params: { page: 1, limit: 5 } });
      setItems(data.data.items || []); setUnread(data.data.unread || 0); setPage(1); setPages(data.data.pagination?.pages || 1); setError('');
    } catch { setError('Notifications could not be loaded.'); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    let active = true;
    api.get('/notifications', { params: { page: 1, limit: 5 } }).then(({ data }) => {
      if (active) { setItems(data.data.items || []); setUnread(data.data.unread || 0); setPage(1); setPages(data.data.pagination?.pages || 1); setError(''); }
    }).catch(() => { if (active) setError('Notifications could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const interval = window.setInterval(() => {
      api.get('/notifications', { params: { page: 1, limit: 5 } }).then(({ data }) => {
        setItems((current) => {
          const latest = data.data.items || [];
          const latestIds = new Set(latest.map((item) => item._id));
          return [...latest, ...current.filter((item) => !latestIds.has(item._id))];
        });
        setUnread(data.data.unread || 0);
        setPages(data.data.pagination?.pages || 1);
      }).catch(() => {});
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const loadMore = async (event) => {
    const element = event.currentTarget;
    if (element.scrollTop + element.clientHeight < element.scrollHeight - 32 || loadingMore || loading || page >= pages) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { data } = await api.get('/notifications', { params: { page: nextPage, limit: 5 } });
      setItems((current) => [...current, ...(data.data.items || [])]); setPage(nextPage); setPages(data.data.pagination?.pages || nextPage); setError('');
    } catch { setError('Older notifications could not be loaded.'); }
    finally { setLoadingMore(false); }
  };
  const markRead = async (item) => { if (item.readAt) return; try { await api.patch(`/notifications/${item._id}/read`); setItems((current) => current.map((entry) => entry._id === item._id ? { ...entry, readAt: new Date().toISOString() } : entry)); setUnread((current) => Math.max(0, current - 1)); } catch { setError('Could not update notification status.'); } };
  const markAll = async () => { try { await api.patch('/notifications/read-all'); await load(); } catch { setError('Could not mark notifications as read.'); } };
  return <Popover.Root open={open} onOpenChange={setOpen}><Popover.Trigger aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[.04] text-white outline-none hover:border-red-500/30 hover:shadow-[0_0_18px_rgba(255,42,42,.16)] focus-visible:ring-2 focus-visible:ring-red-500/30 ${pulse ? 'notification-pulse' : ''}`}><Bell size={18} />{unread > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-600 px-1 text-[9px] font-bold leading-4 text-white">{unread > 99 ? '99+' : unread}</span>}</Popover.Trigger><Popover.Portal><Popover.Content side="bottom" align="end" sideOffset={10} className="z-[110] w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#111116]/95 text-white shadow-2xl shadow-black/60 backdrop-blur-xl"><header className="flex items-center justify-between border-b border-white/10 px-4 py-3"><h2 className="text-sm font-semibold">Notifications</h2>{unread > 0 && <button onClick={markAll} className="inline-flex items-center gap-1 text-[11px] text-red-300 hover:text-white"><CheckCheck size={13} /> Mark all as read</button>}</header>{error && <p role="alert" className="px-4 py-3 text-xs text-red-300">{error}</p>}<ScrollArea className="h-[300px] divide-y divide-white/[.06]" viewportProps={{ onScroll: loadMore }}>{loading ? <div className="space-y-3 p-4">{[0, 1, 2, 3, 4].map((item) => <div key={item} className="space-y-2"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-full" /></div>)}</div> : <>{items.map((item) => { const content = <span className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#ff2a2a]/[.06]"><span className="mt-0.5"><TypeIcon type={item.type} /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-white">{item.title}</span><span className="mt-1 block truncate text-xs text-gray-400">{item.message}</span><time className="mt-1.5 block text-[10px] text-gray-600">{relativeTime(item.createdAt)}</time></span><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.readAt ? 'bg-transparent' : 'bg-[#ff2a2a]'}`} /></span>; return <div key={item._id} className={`border-b border-white/[.06] ${item.readAt ? '' : 'bg-red-950/20'}`}><Link to={item.href || '/dashboard'} onClick={() => { markRead(item); setOpen(false); }}>{content}</Link></div>; })}{loadingMore && <div className="space-y-2 p-4"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-full" /></div>}{!items.length && !error && <p className="px-4 py-12 text-center text-sm text-gray-400">You’re all caught up</p>}</>}</ScrollArea></Popover.Content></Popover.Portal></Popover.Root>;
};
export default NotificationBell;
