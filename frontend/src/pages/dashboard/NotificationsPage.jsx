import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import api, { apiErrorMessage } from '../../services/api';

export const NotificationsPage = () => {
  const [items, setItems] = useState([]); const [error, setError] = useState(''); const [unread, setUnread] = useState(0);
  const load = () => api.get('/notifications').then(({ data }) => { setItems(data.data.items); setUnread(data.data.unread); }).catch((requestError) => setError(apiErrorMessage(requestError, 'Unable to load notifications.')));
  useEffect(() => { load(); }, []);
  const readAll = async () => { try { await api.patch('/notifications/read-all'); await load(); } catch (requestError) { setError(apiErrorMessage(requestError, 'Could not mark notifications read.')); } };
  const markRead = async (item) => { if (item.readAt) return; try { await api.patch(`/notifications/${item._id}/read`); setItems((current) => current.map((notification) => notification._id === item._id ? { ...notification, readAt: new Date().toISOString() } : notification)); setUnread((current) => Math.max(0, current - 1)); } catch (requestError) { setError(apiErrorMessage(requestError, 'Could not mark this notification read.')); } };
  return <main className="mx-auto max-w-4xl space-y-6 text-gray-100"><header className="flex items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[.2em] text-red-300">Your updates</p><h1 className="mt-2 flex items-center gap-2 text-3xl font-bold text-white"><Bell /> Notifications</h1><p className="mt-2 text-sm text-gray-400">{unread} unread</p></div>{unread > 0 && <button onClick={readAll} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs"><CheckCheck size={15} /> Mark all read</button>}</header>{error && <p role="alert" className="text-sm text-red-300">{error}</p>}<div className="space-y-3">{items.map((item) => <article key={item._id} className={`rounded-2xl border p-4 ${item.readAt ? 'border-white/10 bg-white/[.02]' : 'border-red-500/30 bg-red-950/20'}`} onClick={() => markRead(item)}><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-red-300">{item.type}</p><h2 className="mt-1 font-semibold text-white">{item.title}</h2><p className="mt-1 text-sm text-gray-300">{item.message}</p><time className="mt-2 block text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</time></div>{item.href && <Link onClick={() => markRead(item)} to={item.href} className="shrink-0 text-xs text-red-300">Open</Link>}</div></article>)}{!items.length && !error && <p className="py-12 text-center text-sm text-gray-400">You are all caught up.</p>}</div></main>;
};

export default NotificationsPage;
