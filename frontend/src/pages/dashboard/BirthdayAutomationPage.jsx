import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Cake, CalendarDays, Check, Eye, Mail, RefreshCw, Send, Users, XCircle } from 'lucide-react';
import { useSelector } from 'react-redux';
import api, { apiErrorMessage } from '../../services/api';
import { Badge, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, SelectField, Sheet, SheetContent, Skeleton, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from '../../components/ui/Primitives';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { UserAvatar } from '../../components/ui/DesignPrimitives';
import { notify } from '../../utils/notify';

const VARIABLES = ['firstName', 'fullName', 'domain', 'clubName', 'year'];
const TIMEZONES = ['Asia/Kolkata', 'UTC', 'Asia/Dubai', 'Europe/London', 'America/New_York'].map((value) => ({ value, label: value.replaceAll('_', ' ') }));
const statusStyle = { sent: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300', failed: 'border-red-500/30 bg-red-500/10 text-red-300', skipped: 'border-amber-500/30 bg-amber-500/10 text-amber-200', queued: 'border-white/15 bg-white/[.04] text-gray-300' };
const dateLabel = (value, options = { day: 'numeric', month: 'short' }) => value ? new Intl.DateTimeFormat('en', { ...options, timeZone: 'Asia/Kolkata' }).format(new Date(value)) : '—';
const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const DEFAULT_SUBJECT = 'Happy birthday, {{firstName}}! 🎂';
const DEFAULT_HTML = '<div style="font-family:Arial,sans-serif;background:#08080a;color:#fff;padding:32px;border-radius:16px"><div style="border-left:4px solid #ff2a2a;padding:4px 0 4px 20px"><img src="{{logoUrl}}" alt="The Impeccables" width="120"><p style="color:#ff5555;letter-spacing:.18em;text-transform:uppercase">The Impeccables</p><h1>Happy birthday, {{firstName}}!</h1><p>Wishing you a year filled with creativity, good people, and moments worth celebrating.</p><p>We are glad you are part of {{clubName}}.</p></div></div>';
const DEFAULT_TEXT = 'Happy birthday, {{firstName}}! Wishing you a year filled with creativity, good people, and moments worth celebrating. We are glad you are part of {{clubName}}.';
const Stat = ({ label, value, icon: Icon }) => <Card className="flex items-center gap-3 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-300"><Icon size={18} /></span><span><span className="block text-xs text-gray-400">{label}</span><strong className="text-xl text-white">{value ?? '—'}</strong></span></Card>;
const LogMember = ({ log }) => <span className="flex min-w-0 items-center gap-2"><UserAvatar user={log.userId || { name: log.email }} size="xs" /><span className="min-w-0"><span className="block truncate">{log.userId ? `${log.userId.firstName} ${log.userId.lastName}` : 'Account unavailable'}</span><span className="block truncate text-xs text-gray-500">{log.email || '—'}</span></span></span>;

const BirthdayAutomationPage = () => {
  const { role } = useSelector((state) => state.auth);
  const isSuper = role === 'super_admin';
  const [settings, setSettings] = useState(null); const [original, setOriginal] = useState(null); const [status, setStatus] = useState(null);
  const [upcoming, setUpcoming] = useState([]); const [missingCount, setMissingCount] = useState(0); const [missingMembers, setMissingMembers] = useState([]); const [days, setDays] = useState('30');
  const [logs, setLogs] = useState([]); const [todayLogs, setTodayLogs] = useState([]); const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [logFilters, setLogFilters] = useState({ status: '', q: '', from: '', to: '' }); const [detail, setDetail] = useState(null);
  const [preview, setPreview] = useState(''); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState('');
  const [previewSize, setPreviewSize] = useState('desktop');
  const unsaved = useMemo(() => settings && original && JSON.stringify(settings) !== JSON.stringify(original), [settings, original]);

  const loadOverview = useCallback(async () => {
    const [settingsResponse, statusResponse] = await Promise.all([api.get('/automation/birthdays/settings'), api.get('/automation/birthdays/status')]);
    setSettings(settingsResponse.data.data); setOriginal(settingsResponse.data.data); setStatus(statusResponse.data.data);
  }, []);
  const loadUpcoming = useCallback(async (range = days) => {
    const { data } = await api.get(`/automation/birthdays/upcoming?days=${range}`);
    setUpcoming(data.data.items || []); setMissingCount(data.data.missingDateCount || 0); setMissingMembers(data.data.missingMembers || []);
  }, [days]);
  const loadLogs = useCallback(async (page = 1, filters = logFilters) => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (filters.status) params.set('status', filters.status);
    if (filters.q) params.set('q', filters.q);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    const { data } = await api.get(`/automation/birthdays/logs?${params}`);
    setLogs(data.data.items || []); setPagination(data.data.pagination || { page: 1, pages: 1, total: 0 });
  }, [logFilters]);
  const loadTodayLogs = useCallback(async () => {
    const key = todayKey();
    const { data } = await api.get(`/automation/birthdays/logs?from=${key}&to=${key}&limit=100`);
    setTodayLogs(data.data.items || []);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([api.get('/automation/birthdays/settings'), api.get('/automation/birthdays/status'), api.get('/automation/birthdays/upcoming?days=30'), api.get(`/automation/birthdays/logs?from=${todayKey()}&to=${todayKey()}&limit=100`), api.get('/automation/birthdays/logs?limit=20')])
      .then(([s, st, u, today, l]) => { if (!active) return; setSettings(s.data.data); setOriginal(s.data.data); setStatus(st.data.data); setUpcoming(u.data.data.items || []); setMissingCount(u.data.data.missingDateCount || 0); setMissingMembers(u.data.data.missingMembers || []); setTodayLogs(today.data.data.items || []); setLogs(l.data.data.items || []); setPagination(l.data.data.pagination); })
      .catch((error) => notify({ type: 'error', title: 'Birthday automation unavailable', message: apiErrorMessage(error, 'Unable to load birthday settings.') }))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const refresh = async () => {
    try { await Promise.all([loadOverview(), loadUpcoming(days), loadLogs(pagination.page), loadTodayLogs()]); }
    catch (error) { notify({ type: 'error', title: 'Could not refresh', message: apiErrorMessage(error) }); }
  };
  const save = async () => {
    setSaving(true);
    try {
      const payload = Object.fromEntries(Object.entries(settings).filter(([key]) => ['enabled', 'sendTime', 'timezone', 'subject', 'bodyHtml', 'bodyText', 'templateVariables', 'includeClubSignature', 'ccAdmins', 'notifyInApp'].includes(key)));
      const { data } = await api.put('/automation/birthdays/settings', payload);
      setSettings(data.data); setOriginal(data.data); await loadOverview();
      notify({ type: 'success', title: 'Birthday settings saved', message: 'Your changes are now active.' });
    } catch (error) { notify({ type: 'error', title: 'Changes not saved', message: apiErrorMessage(error) }); }
    finally { setSaving(false); }
  };
  const previewTemplate = useCallback(async (draft = settings) => {
    try { const { data } = await api.post('/automation/birthdays/preview', { subject: draft.subject, bodyHtml: draft.bodyHtml, bodyText: draft.bodyText, includeClubSignature: draft.includeClubSignature }); setPreview(data.data.html || ''); }
    catch (error) { notify({ type: 'error', title: 'Preview unavailable', message: apiErrorMessage(error) }); }
  }, [settings]);
  useEffect(() => {
    if (!settings) return undefined;
    const timeout = setTimeout(() => previewTemplate(settings), 350);
    return () => clearTimeout(timeout);
  }, [settings, previewTemplate]);
  const sendTest = async () => {
    try { await api.post('/automation/birthdays/test'); notify({ type: 'success', title: 'Test email sent', message: 'The test was sent only to your account email.' }); await loadLogs(1); }
    catch (error) { notify({ type: 'error', title: 'Test email failed', message: apiErrorMessage(error) }); }
  };
  const runNow = async () => {
    try { const { data } = await api.post('/automation/birthdays/run-now'); setDialog(''); notify({ type: 'success', title: 'Birthday run complete', message: `${data.data.sent} sent, ${data.data.failed} failed, ${data.data.skipped} skipped.` }); await refresh(); }
    catch (error) { notify({ type: 'error', title: 'Birthday run failed', message: apiErrorMessage(error) }); }
  };
  const resend = async (log) => {
    try { await api.post(`/automation/birthdays/resend/${log._id}`); notify({ type: 'success', title: 'Email resent', message: 'The failed birthday message was sent again.' }); await loadLogs(pagination.page); }
    catch (error) { notify({ type: 'error', title: 'Could not resend email', message: apiErrorMessage(error) }); }
  };
  const update = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  const todayBirthdayRows = upcoming.filter((item) => item.daysLeft === 0).map((item) => {
    const existing = todayLogs.find((log) => log.triggeredBy !== 'test' && String(log.userId?._id || log.userId) === String(item.id));
    const statusValue = existing?.status || (item.optedOut || !item.hasEmail ? 'skipped' : 'queued');
    return { id: item.id, name: item.name, email: existing?.email || '', avatar: item.avatar, status: statusValue, reason: existing?.reason || (item.optedOut ? 'opted out' : !item.hasEmail ? 'no valid email' : statusValue === 'queued' ? 'scheduled' : '') };
  });
  const setEnabled = (value) => {
    if (value && !settings.enabled) { setDialog('enable'); return; }
    update('enabled', value);
  };

  if (loading) return <main className="mx-auto max-w-7xl space-y-5"><Skeleton className="h-16 w-80" /><div className="grid gap-3 md:grid-cols-4">{[0,1,2,3].map((n) => <Skeleton key={n} className="h-24" />)}</div><Skeleton className="h-[420px]" /></main>;
  if (!settings) return <main className="mx-auto max-w-5xl rounded-2xl border border-white/10 p-8 text-gray-300">Birthday automation could not load. <Button className="ml-3" onClick={refresh}>Try again</Button></main>;

  return <main className="mx-auto max-w-7xl space-y-6 text-gray-100">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Automation</p><h1 className="mt-2 text-3xl font-bold text-white">Birthday Automation</h1><p className="mt-2 text-sm text-gray-400">Send a birthday email to members automatically.</p></div><div className="flex items-center gap-2">{!isSuper && <Badge variant="outline">View only</Badge>}<Button variant="outline" onClick={refresh} aria-label="Refresh birthday data"><RefreshCw size={15} /></Button></div></header>
    <Tabs defaultValue="overview">
      <TabsList className="max-w-full overflow-x-auto"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="upcoming">Upcoming</TabsTrigger><TabsTrigger value="template">Template</TabsTrigger><TabsTrigger value="logs">Logs</TabsTrigger></TabsList>
      <TabsContent value="overview" className="space-y-5">
        <Card className="flex flex-wrap items-center justify-between gap-5 p-5"><div className="flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300"><Cake /></span><div><h2 className="font-semibold text-white">Birthday emails</h2><p className="mt-1 text-sm text-gray-400">{status?.enabled ? 'Automation is enabled.' : 'Automation is currently turned off.'}</p></div></div><div className="flex flex-wrap items-center gap-4"><div className="text-sm"><p className="text-gray-400">Next run</p><p className="mt-1 text-white">{status?.nextRunAt ? `${dateLabel(status.nextRunAt, { weekday: 'long', day: 'numeric', month: 'short' })}, ${settings.sendTime} ${settings.timezone}` : 'Not scheduled'}</p></div><Badge className={status?.mode === 'redis' ? 'border-sky-500/30 bg-sky-500/10 text-sky-200' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}>{status?.mode === 'redis' ? 'Redis' : 'Fallback'}</Badge><Switch checked={settings.enabled} disabled={!isSuper} onCheckedChange={setEnabled} aria-label="Birthday automation enabled" /></div>{status?.mode === 'fallback' && <p className="w-full text-xs text-gray-500">{status.fallbackReason || 'Using the database-locked in-process scheduler.'}</p>}</Card>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Today's birthdays" value={status?.today?.birthdays} icon={Cake} /><Stat label="This month" value={status?.thisMonth?.birthdays} icon={CalendarDays} /><Stat label="Sent this month" value={status?.thisMonth?.sent} icon={Check} /><Stat label="Failed today" value={status?.today?.failed} icon={XCircle} /></div>
        <Card className="p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-white">Today’s birthday emails</h2><p className="mt-1 text-sm text-gray-400">Delivery status for today in {settings.timezone}.</p></div>{isSuper && <Button onClick={() => setDialog('run') }><Send size={15} className="mr-2" />Run now</Button>}</div>
          {todayBirthdayRows.length ? <div className="space-y-2">{todayBirthdayRows.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.025] p-3"><UserAvatar user={{ name: item.name, avatar: item.avatar }} size="sm" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-white">{item.name}</strong><span className="text-xs text-gray-500">{item.reason || item.email || 'Birthday today'}</span></span><Badge className={statusStyle[item.status]}>{item.status === 'queued' ? 'Scheduled' : item.status}</Badge></div>)}</div> : <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-gray-500">No birthdays today.</div>}
        </Card>
      </TabsContent>
      <TabsContent value="upcoming" className="space-y-4"><Card className="p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-white">Upcoming birthdays</h2><p className="mt-1 text-sm text-gray-400">Birthdays members chose to share with the club.</p></div><SelectField className="w-36" value={days} onChange={(value) => { setDays(value); loadUpcoming(value).catch((error) => notify({ type: 'error', title: 'Upcoming birthdays unavailable', message: apiErrorMessage(error) })); }} options={[{ value: '7', label: 'Next 7 days' }, { value: '30', label: 'Next 30 days' }, { value: '60', label: 'Next 60 days' }]} /></div>
        {upcoming.length ? <div className="divide-y divide-white/[.07]">{upcoming.map((item) => <div key={`${item.id}-${item.date}`} className="flex flex-wrap items-center gap-3 py-3"><UserAvatar user={{ name: item.name, avatar: item.avatar }} size="sm" /><span className="min-w-0 flex-1"><strong className="block text-sm text-white">{item.name}</strong><span className="text-xs text-gray-500">{item.domain}</span></span><Badge variant="outline">{new Date(Date.UTC(2020, item.month - 1, item.day)).toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</Badge><span className="text-xs text-gray-400">{item.daysLeft === 0 ? 'Today' : `In ${item.daysLeft} days`}</span>{!item.hasEmail && <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-200">No email</Badge>}{item.optedOut && <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-200">Opted out</Badge>}</div>)}</div> : <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-gray-500">No birthdays in the selected date range.</p>}</Card><Card className="p-4"><h3 className="text-sm text-gray-400"><Users size={16} className="mr-2 inline text-red-300" />Missing birth date: <strong className="text-white">{missingCount} members</strong></h3>{missingMembers.length > 0 && <div className="mt-3 max-h-52 space-y-2 overflow-y-auto border-t border-white/[.07] pt-3">{missingMembers.map((member) => <div key={member.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-gray-400"><UserAvatar user={{ name: member.name, avatar: member.avatar }} size="xs" /><span className="min-w-0 flex-1 truncate">{member.name}</span><span className="truncate text-xs text-gray-600">{member.domain}</span></div>)}</div>}</Card></TabsContent>
      <TabsContent value="template" className="space-y-4"><Card className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.8fr)]"><div className="space-y-4"><div><h2 className="font-semibold text-white">Email template</h2><p className="mt-1 text-sm text-gray-400">Use the available fields to personalize the birthday message.</p></div>{unsaved && <p className="rounded-lg border border-amber-500/20 bg-amber-500/[.06] px-3 py-2 text-xs text-amber-200">You have unsaved changes.</p>}<label className="block text-sm text-gray-300">Subject<Input value={settings.subject || ''} disabled={!isSuper} onChange={(e) => update('subject', e.target.value)} maxLength={180} /></label><label className="block text-sm text-gray-300">HTML email body<Textarea rows={11} value={settings.bodyHtml || ''} disabled={!isSuper} onChange={(e) => update('bodyHtml', e.target.value)} /></label><label className="block text-sm text-gray-300">Plain text alternative<Textarea rows={4} value={settings.bodyText || ''} disabled={!isSuper} onChange={(e) => update('bodyText', e.target.value)} /></label><div><p className="mb-2 text-xs text-gray-500">Insert a variable</p><div className="flex flex-wrap gap-2">{VARIABLES.map((name) => <button type="button" key={name} disabled={!isSuper} onClick={() => update('bodyHtml', `${settings.bodyHtml || ''}{{${name}}}`)} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-red-200 hover:bg-red-500/10 disabled:opacity-50">{'{{'}{name}{'}}'}</button>)}</div></div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm text-gray-300">Send time<Input type="time" value={settings.sendTime || '09:00'} disabled={!isSuper} onChange={(e) => update('sendTime', e.target.value)} /></label><label className="block text-sm text-gray-300">Timezone<SelectField value={settings.timezone || 'Asia/Kolkata'} disabled={!isSuper} onChange={(value) => update('timezone', value)} options={TIMEZONES} /></label></div>
          {[['includeClubSignature','Include club signature'],['ccAdmins','CC admins'],['notifyInApp','Also send an in-app notification']].map(([key, label]) => <label key={key} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.03] px-3 py-3 text-sm text-gray-300">{label}<Switch checked={Boolean(settings[key])} disabled={!isSuper} onCheckedChange={(value) => update(key, value)} aria-label={label} /></label>)}
          <div className="flex flex-wrap gap-2">{isSuper && <Button onClick={save} isLoading={saving}>Save changes</Button>}{isSuper && <Button variant="outline" onClick={() => setDialog('test')}><Mail size={15} className="mr-2" />Send test to me</Button>}{!isSuper && <Button variant="outline" onClick={previewTemplate}>Refresh preview</Button>}{isSuper && <Button variant="outline" onClick={() => setDialog('reset')}>Reset to default</Button>}</div></div>
          <div className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-medium text-white">Live preview</h3><div className="flex gap-2"><Button size="sm" variant={previewSize === 'desktop' ? 'secondary' : 'outline'} onClick={() => setPreviewSize('desktop')}>Desktop</Button><Button size="sm" variant={previewSize === 'mobile' ? 'secondary' : 'outline'} onClick={() => setPreviewSize('mobile')}>Mobile</Button><Button size="sm" variant="outline" onClick={previewTemplate}><Eye size={14} className="mr-1" />Refresh</Button></div></div><div className="overflow-auto rounded-xl border border-white/10 bg-[#08080a] p-2"><iframe title="Birthday email preview" sandbox="" srcDoc={preview || '<p style="color:#aaa;font-family:Arial;padding:24px">Preview will appear here.</p>'} className={`mx-auto h-[420px] rounded-lg border-0 bg-[#08080a] transition-[width] ${previewSize === 'mobile' ? 'w-[375px] max-w-full' : 'w-full'}`} /></div></div></Card></TabsContent>
      <TabsContent value="logs" className="space-y-4"><Card className="space-y-4 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-white">Delivery logs</h2><p className="mt-1 text-sm text-gray-400">A record of each birthday email attempt.</p></div><div className="flex flex-wrap gap-2"><Input className="w-48" placeholder="Search member or email" value={logFilters.q} onChange={(e) => { const filters = { ...logFilters, q: e.target.value }; setLogFilters(filters); loadLogs(1, filters).catch((error) => notify({ type: 'error', title: 'Birthday logs unavailable', message: apiErrorMessage(error) })); }} /><Input aria-label="From date" className="w-36" type="date" value={logFilters.from} onChange={(e) => { const filters = { ...logFilters, from: e.target.value }; setLogFilters(filters); loadLogs(1, filters).catch((error) => notify({ type: 'error', title: 'Birthday logs unavailable', message: apiErrorMessage(error) })); }} /><Input aria-label="To date" className="w-36" type="date" value={logFilters.to} onChange={(e) => { const filters = { ...logFilters, to: e.target.value }; setLogFilters(filters); loadLogs(1, filters).catch((error) => notify({ type: 'error', title: 'Birthday logs unavailable', message: apiErrorMessage(error) })); }} /><SelectField className="w-36" value={logFilters.status || 'all'} placeholder="All statuses" onChange={(value) => { const filters = { ...logFilters, status: value === 'all' ? '' : value }; setLogFilters(filters); loadLogs(1, filters).catch((error) => notify({ type: 'error', title: 'Birthday logs unavailable', message: apiErrorMessage(error) })); }} options={[{ value: 'all', label: 'All statuses' }, ...['sent','failed','skipped','queued'].map((value) => ({ value, label: value }))]} /></div></div>
        {logs.length ? <><div className="hidden md:block"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Member</TableHead><TableHead>Status</TableHead><TableHead>Reason / error</TableHead><TableHead>Triggered by</TableHead><TableHead /></TableRow></TableHeader><TableBody>{logs.map((log) => <TableRow key={log._id} onClick={() => setDetail(log)} className="cursor-pointer"><TableCell>{log.date}</TableCell><TableCell><LogMember log={log} /></TableCell><TableCell><Badge className={statusStyle[log.status]}>{log.status}</Badge></TableCell><TableCell className="max-w-64 truncate">{log.reason || log.error || '—'}</TableCell><TableCell>{log.triggeredBy}</TableCell><TableCell>{isSuper && log.status === 'failed' && <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); resend(log); }}>Resend</Button>}</TableCell></TableRow>)}</TableBody></Table></div><div className="space-y-2 md:hidden">{logs.map((log) => <div key={log._id} className="rounded-xl border border-white/10 bg-white/[.025] p-3"><div className="flex items-start justify-between gap-2"><LogMember log={log} /><Badge className={statusStyle[log.status]}>{log.status}</Badge></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400"><span>{log.date}</span><span>{log.triggeredBy}</span></div><p className="mt-2 break-words text-xs text-gray-500">{log.reason || log.error || 'No reason recorded'}</p><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => setDetail(log)}>View details</Button>{isSuper && log.status === 'failed' && <Button size="sm" variant="outline" onClick={() => resend(log)}>Resend</Button>}</div></div>)}</div></> : <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-gray-500">No email logs match these filters.</div>}
        <div className="flex items-center justify-between text-xs text-gray-500"><span>{pagination.total || 0} records</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={pagination.page <= 1} onClick={() => loadLogs(pagination.page - 1)}>Previous</Button><span className="self-center">Page {pagination.page || 1} of {pagination.pages || 1}</span><Button size="sm" variant="outline" disabled={pagination.page >= pagination.pages} onClick={() => loadLogs(pagination.page + 1)}>Next</Button></div></div></Card></TabsContent>
    </Tabs>
    <Dialog open={Boolean(dialog)} onOpenChange={(open) => !open && setDialog('')}><DialogContent><DialogHeader><DialogTitle>{dialog === 'enable' ? 'Enable birthday emails?' : dialog === 'run' ? 'Run birthday emails now?' : dialog === 'test' ? 'Send a test email?' : 'Reset the template?'}</DialogTitle><DialogDescription>{dialog === 'enable' ? 'Eligible members with a birthday today will receive one message at the scheduled time. You can turn this off at any time.' : dialog === 'run' ? `This will send the current birthday template to eligible members with birthdays today. Estimated eligible birthdays: ${status?.today?.eligibleToEmail ?? 0}. Each member is protected from duplicate sends.` : dialog === 'test' ? 'The test email goes only to your own account email.' : 'This replaces the subject and message with the club default. Save to apply the default template.'}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDialog('')}>Cancel</Button><Button onClick={async () => { const action = dialog; setDialog(''); if (action === 'enable') update('enabled', true); else if (action === 'run') await runNow(); else if (action === 'test') await sendTest(); else if (action === 'reset') { update('subject', DEFAULT_SUBJECT); update('bodyHtml', DEFAULT_HTML); update('bodyText', DEFAULT_TEXT); } }}>{dialog === 'run' ? 'Run now' : dialog === 'test' ? 'Send test' : dialog === 'reset' ? 'Reset template' : 'Enable'}</Button></DialogFooter></DialogContent></Dialog>
    <Sheet open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}><SheetContent className="w-full max-w-xl"><div className="mb-5"><p className="eyebrow">Birthday delivery</p><h2 className="mt-2 text-xl font-semibold">{detail?.userId ? `${detail.userId.firstName} ${detail.userId.lastName}` : detail?.email}</h2><p className="mt-1 text-sm text-gray-400">{detail?.date} · {detail?.triggeredBy}</p></div>{detail && <div className="space-y-3 rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm"><p><span className="text-gray-500">Email: </span>{detail.email || '—'}</p><p><span className="text-gray-500">Status: </span>{detail.status}</p><p><span className="text-gray-500">Reason: </span>{detail.reason || '—'}</p><p><span className="text-gray-500">Error: </span>{detail.error || '—'}</p><p><span className="text-gray-500">Provider message ID: </span>{detail.providerMessageId || '—'}</p><p><span className="text-gray-500">Sent at: </span>{detail.sentAt ? new Date(detail.sentAt).toLocaleString() : '—'}</p></div>}{detail?.status === 'failed' && isSuper && <Button className="mt-4" onClick={() => resend(detail)}>Resend</Button>}</SheetContent></Sheet>
  </main>;
};

export default BirthdayAutomationPage;
