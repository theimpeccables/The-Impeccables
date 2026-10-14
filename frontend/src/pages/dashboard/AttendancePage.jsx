import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { CalendarPlus, Clock3, MapPin, UserRound } from 'lucide-react';
import api, { apiErrorMessage } from '../../services/api';
import { notify } from '../../utils/notify';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Textarea } from '../../components/ui/Primitives';
import { SelectField } from '../../components/ui/Primitives';
import { Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, MultiSelectField, Badge, Skeleton, ToggleGroup, ToggleGroupItem } from '../../components/ui/Primitives';

const newDraft = { title: '', groupIds: [], date: '', endTime: '', venue: '', agenda: '', organizerId: '' };
const endTimeText = (value) => { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };

export const MeetingRsvp = ({ meeting, onSaved }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState('');
  const [reason, setReason] = useState(meeting.ownRsvp?.reason || '');
  const [saving, setSaving] = useState(false);
  const disabled = meeting.status !== 'upcoming';
  const save = async (status, why = '') => {
    setSaving(true);
    try {
      const { data } = await api.put(`/meetings/${meeting._id}/response`, { status, reason: status === 'not_attending' ? why.trim() : '' });
      setReason(data.data.reason || ''); onSaved?.(data.data);
      setDialogOpen(false); setPending('');
      notify({ type: 'success', title: 'RSVP saved', message: 'Your response has been updated.' });
    } catch (error) { notify({ type: 'error', title: 'RSVP not saved', message: apiErrorMessage(error, 'Please try again.') }); }
    finally { setSaving(false); }
  };
  const choose = (value) => {
    if (value === 'not_attending') { setPending(value); setDialogOpen(true); }
    if (value === 'attending') save(value);
  };
  return <div className="space-y-1" onClick={(event) => event.stopPropagation()}>
    <ToggleGroup aria-label="Your meeting RSVP" value={meeting.ownRsvp?.status || ''} onValueChange={choose} disabled={disabled || saving} className="w-fit">
      <ToggleGroupItem value="attending">Will attend</ToggleGroupItem><ToggleGroupItem value="not_attending">Can't attend</ToggleGroupItem>
    </ToggleGroup>
    {meeting.ownRsvp?.status === 'not_attending' && <p className="text-xs text-gray-400">{reason} <button className="text-red-300 hover:text-red-200" disabled={disabled} onClick={() => { setPending('not_attending'); setDialogOpen(true); }}>Edit</button></p>}
    {meeting.ownFinal?.status && <Badge className="mt-1" variant={meeting.ownFinal.status === 'present' ? 'default' : meeting.ownFinal.status === 'absent' ? 'destructive' : 'outline'}>{meeting.ownFinal.status[0].toUpperCase() + meeting.ownFinal.status.slice(1)}</Badge>}
    <Dialog open={dialogOpen} onOpenChange={(open) => !saving && setDialogOpen(open)}><DialogContent><DialogHeader><DialogTitle>Why can't you attend?</DialogTitle><DialogDescription>Your reason will be visible to the meeting organizer.</DialogDescription></DialogHeader><Textarea autoFocus required maxLength={500} rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Add a short reason" /><DialogFooter><Button variant="secondary" onClick={() => { setDialogOpen(false); setPending(''); setReason(meeting.ownRsvp?.reason || ''); }}>Cancel</Button><Button disabled={!reason.trim()} isLoading={saving} onClick={() => save(pending || 'not_attending', reason)}>Save RSVP</Button></DialogFooter></DialogContent></Dialog>
  </div>;
};

const MeetingCard = ({ meeting, onRsvp }) => <Card className="p-0 transition-colors hover:border-red-500/30"><div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
  <Link to={`/meetings/${meeting._id}`} className="min-w-0 flex-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-base font-semibold text-white">{meeting.title}</h2>{meeting.groups?.map((group) => <Badge key={group._id} variant="outline">{group.name}</Badge>)}<Badge className={meeting.status === 'completed' ? 'border-green-500/20 bg-green-500/10 text-green-200' : ''}>{meeting.status === 'completed' ? 'Completed' : 'Upcoming'}</Badge></div>
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400"><span className="inline-flex items-center gap-1"><Clock3 size={13} />{new Date(meeting.date).toLocaleString()}{meeting.endTime ? ` – ${endTimeText(meeting.endTime)}` : ''}</span><span className="inline-flex items-center gap-1"><MapPin size={13} />{meeting.venue || meeting.meetingLink || 'Venue to be announced'}</span><span className="inline-flex items-center gap-1"><UserRound size={13} />{meeting.organizer?.firstName} {meeting.organizer?.lastName}</span></div></Link>
  <div className="flex flex-col items-start gap-2 sm:items-end">{meeting.canManage ? <><p className="text-xs text-gray-400">{meeting.rsvpSummary?.attending || 0} attending, {meeting.rsvpSummary?.notAttending || 0} can't attend, {meeting.rsvpSummary?.noReply || 0} no reply</p><Link to={`/meetings/${meeting._id}`}><Button size="sm" variant="outline">Manage</Button></Link></> : <MeetingRsvp meeting={meeting} onSaved={onRsvp} />}</div>
</div></Card>;

const AttendancePage = () => {
  const role = useSelector((state) => state.auth.role);
  const clubAdmin = ['admin', 'super_admin'].includes(role);
  const [meetings, setMeetings] = useState([]); const [groups, setGroups] = useState([]); const [members, setMembers] = useState([]);
  const [groupFilter, setGroupFilter] = useState('all'); const [draft, setDraft] = useState(newDraft);
  const [createOpen, setCreateOpen] = useState(false); const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [loadError, setLoadError] = useState('');
  const load = useCallback(async () => {
    try { const requests = [api.get('/meetings'), api.get('/groups')]; if (clubAdmin) requests.push(api.get('/members?limit=100')); const results = await Promise.all(requests); setMeetings(results[0].data.data || []); setGroups(results[1].data.data || []); if (clubAdmin) setMembers(results[2].data.data || []); setLoadError(''); }
    catch (requestError) { setLoadError(apiErrorMessage(requestError, 'Meetings could not be loaded.')); }
    finally { setLoading(false); }
  }, [clubAdmin]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  const manageableGroups = groups.filter((group) => group.myRole === 'lead');
  const canCreate = clubAdmin || manageableGroups.length > 0;
  const updateRsvp = (meetingId, rsvp) => setMeetings((items) => items.map((meeting) => meeting._id === meetingId ? { ...meeting, ownRsvp: rsvp } : meeting));
  const create = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try { const { organizerId, ...details } = draft; const { data } = await api.post('/meetings', { ...details, date: new Date(draft.date).toISOString(), endTime: draft.endTime ? new Date(draft.endTime).toISOString() : null, ...(organizerId && organizerId !== 'self' ? { organizerId } : {}) }); setMeetings((items) => [data.data, ...items]); setDraft(newDraft); setCreateOpen(false); await load(); notify({ type: 'success', title: 'Meeting created', message: 'Group members have been notified.' }); }
    catch (requestError) { setError(apiErrorMessage(requestError, 'Could not create the meeting.')); }
    finally { setSaving(false); }
  };
  const filtered = meetings.filter((meeting) => groupFilter === 'all' || !meeting.groups?.length || meeting.groups.some((group) => String(group._id) === groupFilter));
  const upcoming = filtered.filter((meeting) => meeting.status !== 'completed' && meeting.status !== 'cancelled');
  const completed = filtered.filter((meeting) => meeting.status === 'completed');
  return <main className="mx-auto max-w-6xl space-y-5 text-gray-100">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold text-white">Meetings</h1><p className="mt-1 text-sm text-gray-400">Your meetings and attendance</p></div>{canCreate && <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogTrigger asChild><Button icon={CalendarPlus}>New Meeting</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>New meeting</DialogTitle><DialogDescription>Choose who it is for and add the time and details.</DialogDescription></DialogHeader><form onSubmit={create} className="space-y-3"><label className="block space-y-1 text-xs text-gray-400">Title<Input required minLength={2} maxLength={180} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label><label className="block space-y-1 text-xs text-gray-400">Who is this meeting for?<MultiSelectField placeholder="Choose groups" selectedValues={draft.groupIds} options={(clubAdmin ? groups : manageableGroups).map((group) => ({ value: String(group._id), label: group.name }))} onChange={(groupIds) => setDraft((current) => ({ ...current, groupIds }))} /></label>{clubAdmin && <label className="block space-y-1 text-xs text-gray-400">Organizer<SelectField value={draft.organizerId || 'self'} onChange={(organizerId) => setDraft((current) => ({ ...current, organizerId }))} options={[{ value: 'self', label: 'Me' }, ...members.map((member) => ({ value: member.id, label: `${member.name} · ${member.email}` }))]} /></label>}<label className="block space-y-1 text-xs text-gray-400">Date and time<Input type="datetime-local" required value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} /></label><label className="block space-y-1 text-xs text-gray-400">End time (optional)<Input type="datetime-local" value={draft.endTime} onChange={(event) => setDraft((current) => ({ ...current, endTime: event.target.value }))} /></label><label className="block space-y-1 text-xs text-gray-400">Venue or link<Input maxLength={500} value={draft.venue} onChange={(event) => setDraft((current) => ({ ...current, venue: event.target.value }))} /></label><label className="block space-y-1 text-xs text-gray-400">Agenda<Textarea maxLength={12000} rows={4} value={draft.agenda} onChange={(event) => setDraft((current) => ({ ...current, agenda: event.target.value }))} /></label>{error && <p role="alert" className="text-sm text-red-300">{error}</p>}<DialogFooter><Button type="submit" disabled={!draft.groupIds.length} isLoading={saving}>Create meeting</Button></DialogFooter></form></DialogContent></Dialog>}</header>
    <div className="max-w-xs"><SelectField value={groupFilter} onChange={setGroupFilter} options={[{ value: 'all', label: 'All my groups' }, ...groups.filter((group) => clubAdmin || group.myRole).map((group) => ({ value: String(group._id), label: group.name }))]} /></div>
    {loadError && <Card role="alert" className="flex items-center justify-between gap-3 border-red-500/30 p-4 text-sm text-red-200"><span>{loadError}</span><Button size="sm" variant="outline" onClick={load}>Try again</Button></Card>}
    <Tabs defaultValue="upcoming"><TabsList><TabsTrigger value="upcoming">Upcoming</TabsTrigger><TabsTrigger value="completed">Completed</TabsTrigger></TabsList>{loading ? <div className="mt-4 space-y-3"><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></div> : <><TabsContent value="upcoming" className="space-y-3">{upcoming.length ? upcoming.map((meeting) => <MeetingCard key={meeting._id} meeting={meeting} onRsvp={(rsvp) => updateRsvp(meeting._id, rsvp)} />) : <Card className="p-10 text-center text-sm text-gray-400">No upcoming meetings</Card>}</TabsContent><TabsContent value="completed" className="space-y-3">{completed.length ? completed.map((meeting) => <MeetingCard key={meeting._id} meeting={meeting} onRsvp={(rsvp) => updateRsvp(meeting._id, rsvp)} />) : <Card className="p-10 text-center text-sm text-gray-400">No completed meetings</Card>}</TabsContent></>}</Tabs>
  </main>;
};
export default AttendancePage;
