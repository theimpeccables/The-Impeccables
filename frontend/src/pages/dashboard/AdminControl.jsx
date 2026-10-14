import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, FilePlus2, FileText, Shield, Users, CalendarDays, CheckCircle2, Megaphone } from 'lucide-react';
import api, { apiErrorMessage } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { useSelector } from 'react-redux';

export const AdminControl = () => {
  const { permissions } = useSelector((state) => state.auth);
  const [overview, setOverview] = useState(null); const [error, setError] = useState(''); const [reportMessage, setReportMessage] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; api.get('/admin/overview').then(({ data }) => { if (active) setOverview(data.data); }).catch((requestError) => { if (active) setError(apiErrorMessage(requestError, 'Unable to load the administration overview.')); }); return () => { active = false; }; }, []);
  const generateReport = async () => { setBusy(true); setReportMessage(''); try { await api.post('/admin/reports/weekly'); setReportMessage('Weekly report generated and saved.'); } catch (requestError) { setReportMessage(apiErrorMessage(requestError, 'Report could not be generated.')); } finally { setBusy(false); } };
  const stats = [['Active members', overview?.members ?? '—', Users], ['Published works', overview?.publishedPosts ?? '—', CheckCircle2], ['Waiting for review', overview?.pendingApprovals ?? '—', FileText], ['Open tasks', overview?.openTasks ?? '—', BarChart3]];
  const links = [
    ['Content & announcements', '/dashboard/content', FilePlus2, permissions.includes('event:create') || permissions.includes('announcement:create')],
    ['Members and roles', '/dashboard/members', Users, permissions.includes('member:manage')],
    ['Audit history', '/dashboard/audit', Shield, permissions.includes('audit:view')],
    ['System settings', '/dashboard/settings', Shield, permissions.includes('settings:view')],
    ['Events', '/events', CalendarDays, true],
    ['Announcements', '/announcements', Megaphone, true],
  ].filter(([, , , allowed]) => allowed);
  return <main className="mx-auto max-w-6xl space-y-8 text-gray-100"><header><p className="text-xs uppercase tracking-[.2em] text-red-300">Administration</p><h1 className="mt-2 text-3xl font-bold text-white">Operations overview</h1><p className="mt-2 text-sm text-gray-400">Live metrics and tools for the club team.</p></header>{error && <p role="alert" className="text-sm text-red-300">{error}</p>}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value, Icon]) => <Card key={label}><Icon className="mb-3 text-red-300" size={19} /><p className="text-xs uppercase text-gray-400">{label}</p><p className="mt-1 text-3xl font-black text-white">{value}</p></Card>)}</div><div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><Card className="p-6"><h2 className="mb-4 text-lg font-semibold text-white">Administration tools</h2><div className="grid gap-3 sm:grid-cols-2">{links.map(([label, href, Icon]) => <Link key={href} to={href} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-gray-200 transition hover:border-red-500/40"><Icon size={18} className="text-red-300" />{label}</Link>)}</div></Card><Card className="p-6"><h2 className="text-lg font-semibold text-white">Weekly club report</h2><p className="mt-2 text-sm text-gray-400">Save a report with member, content, task, event and attendance activity for the last seven days.</p>{permissions.includes('report:generate') && <button disabled={busy} onClick={generateReport} className="mt-5 rounded-full bg-red-600 px-5 py-2.5 text-sm text-white disabled:opacity-50">{busy ? 'Generating…' : 'Generate report'}</button>}{reportMessage && <p className="mt-3 text-xs text-gray-300" role="status">{reportMessage}</p>}</Card></div><Card className="p-6"><h2 className="text-lg font-semibold text-white">Upcoming events</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{overview?.upcomingEvents?.map((event) => <div key={event._id} className="rounded-xl border border-white/10 p-4"><h3 className="font-semibold text-white">{event.title}</h3><p className="mt-1 text-xs text-gray-400">{new Date(event.date).toLocaleString()} · {event.venue}</p></div>)}{overview && !overview.upcomingEvents.length && <p className="text-sm text-gray-400">No upcoming published events.</p>}</div></Card></main>;
};

export default AdminControl;
