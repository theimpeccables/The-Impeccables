import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, CalendarClock, MapPin, MoreHorizontal, Search } from 'lucide-react';
import api, { apiErrorMessage } from '../../services/api';
import { notify } from '../../utils/notify';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Avatar, AvatarFallback, AvatarImage, Badge, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, ToggleGroup, ToggleGroupItem, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/Primitives';
import { MeetingRsvp } from './AttendancePage';

const textOf = (user) => `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
const titleStatus = (status) => status ? status[0].toUpperCase() + status.slice(1) : 'Not marked';
const EMPTY_ROWS = [];
const toLocalInput = (value) => { const date = new Date(value); if (!value || Number.isNaN(date.getTime())) return ''; return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const endTimeLabel = (value) => { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };

const MeetingDetailPage = () => {
  const { meetingId } = useParams();
  const [meeting, setMeeting] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [started, setStarted] = useState(false);
  const [agenda, setAgenda] = useState(''); const [conclusion, setConclusion] = useState(''); const [savingField, setSavingField] = useState('');
  const [search, setSearch] = useState(''); const [noteTarget, setNoteTarget] = useState(null); const [rowNote, setRowNote] = useState(''); const [savingAttendance, setSavingAttendance] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false); const [unmarkedCount, setUnmarkedCount] = useState(null); const [completing, setCompleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false); const [editDraft, setEditDraft] = useState({}); const [cancelOpen, setCancelOpen] = useState(false);
  const authUser = useSelector((state) => state.auth.user);
  const load = useCallback(async () => {
    try { const { data } = await api.get(`/meetings/${meetingId}`); setMeeting(data.data); setStarted(new Date(data.data.date).getTime() <= Date.now()); setAgenda(data.data.agenda || ''); setConclusion(data.data.conclusion || ''); setError(''); }
    catch (requestError) { setError(apiErrorMessage(requestError, 'This meeting could not be loaded.')); }
    finally { setLoading(false); }
  }, [meetingId]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  const attendanceRows = meeting?.attendanceRows || EMPTY_ROWS;
  const summary = meeting?.attendanceSummary || { present: 0, absent: 0, excused: 0, notMarked: 0 };
  const filteredRows = useMemo(() => attendanceRows.filter((row) => textOf(row.user).toLowerCase().includes(search.trim().toLowerCase())), [attendanceRows, search]);
  const canManage = Boolean(meeting?.canManage);
  const isCompleted = meeting?.status === 'completed';
  useEffect(() => {
    if (!meeting?.date) return undefined;
    const delay = new Date(meeting.date).getTime() - Date.now();
    const timer = window.setTimeout(() => setStarted(true), Math.max(0, delay));
    return () => window.clearTimeout(timer);
  }, [meeting?.date]);

  const saveText = async (kind) => {
    setSavingField(kind);
    try { const value = kind === 'agenda' ? agenda : conclusion; const { data } = await api.patch(`/meetings/${meetingId}/${kind === 'agenda' ? 'agenda' : 'conclusion'}`, { [kind]: value }); setMeeting((current) => ({ ...current, [kind]: data.data[kind] })); notify({ type: 'success', title: kind === 'agenda' ? 'Agenda saved' : 'Conclusion saved', message: 'Meeting details were updated.' }); }
    catch (requestError) { notify({ type: 'error', title: 'Could not save', message: apiErrorMessage(requestError, 'Please try again.') }); }
    finally { setSavingField(''); }
  };

  const saveAttendance = async (userId, status, note = '') => {
    setSavingAttendance(true);
    const previous = meeting.attendanceRows.find((row) => row.user._id === userId)?.attendance;
    setMeeting((current) => ({ ...current, attendanceRows: current.attendanceRows.map((row) => row.user._id === userId ? { ...row, attendance: { ...(row.attendance || {}), status, notes: note } } : row) }));
    try { await api.put(`/meetings/${meetingId}/attendance/${userId}`, { status, note }); await load(); notify({ type: 'success', title: 'Attendance saved', message: `${titleStatus(status)} recorded.` }); }
    catch (requestError) { setMeeting((current) => ({ ...current, attendanceRows: current.attendanceRows.map((row) => row.user._id === userId ? { ...row, attendance: previous || null } : row) })); notify({ type: 'error', title: 'Attendance not saved', message: apiErrorMessage(requestError, 'Please try again.') }); }
    finally { setSavingAttendance(false); setNoteTarget(null); }
  };
  const chooseAttendance = (userId, status, currentNote) => {
    if (status === 'excused') { setNoteTarget(userId); setRowNote(currentNote || ''); }
    else saveAttendance(userId, status);
  };
  const markAllPresent = async () => {
    try { await api.post(`/meetings/${meetingId}/attendance/mark-all-present`); await load(); notify({ type: 'success', title: 'Attendance updated', message: 'All group members were marked present.' }); }
    catch (requestError) { notify({ type: 'error', title: 'Could not mark attendance', message: apiErrorMessage(requestError, 'Please try again.') }); }
  };
  const completeMeeting = async (confirm = false) => {
    setCompleting(true);
    try {
      const { data } = await api.post(`/meetings/${meetingId}/complete`, { confirm });
      if (data.data.requiresConfirmation) { setUnmarkedCount(data.data.unmarkedCount); setCompleteOpen(true); }
      else { setCompleteOpen(false); setUnmarkedCount(null); await load(); notify({ type: 'success', title: 'Meeting completed', message: 'The group has been notified and unmarked members were set absent.' }); }
    } catch (requestError) { notify({ type: 'error', title: 'Could not complete meeting', message: apiErrorMessage(requestError, 'Please try again.') }); }
    finally { setCompleting(false); }
  };
  const saveEdit = async (event) => {
    event.preventDefault(); setSavingField('edit');
    try { await api.patch(`/meetings/${meetingId}`, { ...editDraft, date: new Date(editDraft.date).toISOString(), endTime: editDraft.endTime ? new Date(editDraft.endTime).toISOString() : null }); setEditOpen(false); await load(); notify({ type: 'success', title: 'Meeting updated', message: 'Meeting details were saved.' }); }
    catch (requestError) { notify({ type: 'error', title: 'Could not update meeting', message: apiErrorMessage(requestError, 'Please try again.') }); }
    finally { setSavingField(''); }
  };
  const cancelMeeting = async () => {
    try { await api.patch(`/meetings/${meetingId}`, { status: 'cancelled' }); setCancelOpen(false); await load(); notify({ type: 'success', title: 'Meeting cancelled', message: 'Group members have been notified.' }); }
    catch (requestError) { notify({ type: 'error', title: 'Could not cancel meeting', message: apiErrorMessage(requestError, 'Please try again.') }); }
  };
  const onRsvpSaved = (rsvp) => setMeeting((current) => ({ ...current, ownRsvp: rsvp }));

  if (loading) return <main className="mx-auto max-w-6xl space-y-4"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-32 w-full" /><Skeleton className="h-72 w-full" /></main>;
  if (error || !meeting) return <main className="mx-auto max-w-6xl"><Card role="alert" className="space-y-3 p-6"><p className="text-sm text-red-200">{error || 'Meeting not found.'}</p><Button variant="outline" onClick={load}>Try again</Button><Link to="/dashboard/attendance" className="ml-3 text-sm text-gray-400">Back to meetings</Link></Card></main>;
  const organizer = meeting.organizer;
  return <TooltipProvider delayDuration={250}><main className="mx-auto max-w-6xl space-y-5 text-gray-100">
    <Link to="/dashboard/attendance" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"><ArrowLeft size={16} /> Meetings</Link>
    <Card className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold text-white sm:text-3xl">{meeting.title}</h1><Badge className={isCompleted ? 'border-green-500/20 bg-green-500/10 text-green-200' : meeting.status === 'cancelled' ? 'border-red-500/30 bg-red-500/10 text-red-200' : ''}>{titleStatus(meeting.status)}</Badge>{meeting.groups?.map((group) => <Badge key={group._id} variant="outline">{group.name}</Badge>)}</div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-400"><span className="inline-flex items-center gap-2"><CalendarClock size={15} />{new Date(meeting.date).toLocaleString()}</span><span className="inline-flex items-center gap-2"><MapPin size={15} />{meeting.venue || meeting.meetingLink || 'Venue to be announced'}</span><span className="inline-flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarImage src={organizer?.profilePhoto} /><AvatarFallback>{organizer?.firstName?.[0] || 'O'}</AvatarFallback></Avatar>{textOf(organizer)}</span></div></div>
      <div className="flex items-center gap-2">{canManage && !isCompleted && <Button disabled={!started} onClick={() => { setUnmarkedCount(null); setCompleteOpen(true); }}>Mark meeting as completed</Button>}{canManage && !isCompleted && <DropdownMenu><DropdownMenuTrigger aria-label="Meeting actions" className="rounded-lg border border-white/10 bg-white/[.04] p-2 text-gray-300 hover:bg-red-500/10"><MoreHorizontal size={18} /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => { setEditDraft({ title: meeting.title, date: toLocalInput(meeting.date), endTime: toLocalInput(meeting.endTime), venue: meeting.venue || '', meetingLink: meeting.meetingLink || '' }); setEditOpen(true); }}>Edit meeting</DropdownMenuItem><DropdownMenuItem className="text-red-200" onSelect={() => setCancelOpen(true)}>Cancel meeting</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</div></div>
      {!canManage && <div className="mt-4"><MeetingRsvp meeting={meeting} onSaved={onRsvpSaved} /></div>}
      {meeting.ownFinal?.status && <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-300">Your final attendance: <Badge>{titleStatus(meeting.ownFinal.status)}</Badge>{meeting.ownFinal.notes && <span className="text-gray-400">{meeting.ownFinal.notes}</span>}</div>}
    </Card>
    {isCompleted && !canManage && <Card className="grid gap-5 p-5 sm:grid-cols-2"><div><h2 className="font-semibold text-white">Agenda</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-300">{meeting.agenda || 'No agenda added.'}</p></div><div><h2 className="font-semibold text-white">Conclusion / Minutes</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-300">{meeting.conclusion || 'No conclusion added.'}</p></div><div className="sm:col-span-2"><h2 className="font-semibold text-white">Attendance summary</h2><div className="mt-2 flex flex-wrap gap-2 text-xs"><Badge className="border-green-500/20 bg-green-500/10 text-green-200">Present {summary.present}</Badge><Badge className="border-red-500/20 bg-red-500/10 text-red-200">Absent {summary.absent}</Badge><Badge className="border-amber-500/20 bg-amber-500/10 text-amber-200">Excused {summary.excused}</Badge></div></div></Card>}
    <Tabs defaultValue="overview"><TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="attendance">Attendance</TabsTrigger><TabsTrigger value="notes">Notes</TabsTrigger></TabsList>
      <TabsContent value="overview"><div className="grid gap-4 lg:grid-cols-2"><Card className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-white">Agenda</h2>{canManage && !isCompleted && <Button size="sm" onClick={() => saveText('agenda')} isLoading={savingField === 'agenda'}>Save</Button>}</div>{canManage && !isCompleted ? <Textarea className="mt-3 min-h-56" value={agenda} onChange={(event) => setAgenda(event.target.value)} placeholder="Add the meeting agenda" /> : <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-300">{meeting.agenda || 'No agenda added.'}</p>}</Card><Card className="space-y-3 p-5"><h2 className="font-semibold text-white">Meeting details</h2><p className="text-sm text-gray-400">{new Date(meeting.date).toLocaleString()}{meeting.endTime ? ` – ${endTimeLabel(meeting.endTime)}` : ''}</p><p className="text-sm text-gray-400">{meeting.venue || meeting.meetingLink || 'Venue to be announced'}</p><p className="text-sm text-gray-400">Organized by {textOf(organizer)}</p></Card></div></TabsContent>
      <TabsContent value="attendance"><Card className="space-y-4 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2 text-xs"><Badge className="border-green-500/20 bg-green-500/10 text-green-200">Present {summary.present}</Badge><Badge className="border-red-500/20 bg-red-500/10 text-red-200">Absent {summary.absent}</Badge><Badge className="border-amber-500/20 bg-amber-500/10 text-amber-200">Excused {summary.excused}</Badge><Badge variant="outline">Not marked {summary.notMarked}</Badge></div>{canManage && <div className="flex flex-wrap items-center gap-2"><div className="relative"><Search className="absolute left-3 top-2.5 text-gray-500" size={15} /><Input className="h-9 w-52 pl-9" placeholder="Search by name" value={search} onChange={(event) => setSearch(event.target.value)} /></div><Tooltip><TooltipTrigger asChild><span tabIndex={0}><Button size="sm" variant="outline" disabled={!started} onClick={markAllPresent}>Mark all present</Button></span></TooltipTrigger>{!started && <TooltipContent>Available once the meeting starts</TooltipContent>}</Tooltip></div>}</div>
        {canManage ? attendanceRows.length ? <><div className="hidden md:block"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>RSVP</TableHead><TableHead>Attendance</TableHead></TableRow></TableHeader><TableBody>{filteredRows.map((row) => <AttendanceTableRow key={row.user._id} row={row} disabled={!started || savingAttendance} onChoose={chooseAttendance} />)}</TableBody></Table></div><div className="space-y-3 md:hidden">{filteredRows.map((row) => <AttendanceMobileRow key={row.user._id} row={row} disabled={!started || savingAttendance} onChoose={chooseAttendance} />)}</div>{!filteredRows.length && <p className="py-8 text-center text-sm text-gray-500">No members match that name.</p>}</> : <p className="py-8 text-center text-sm text-gray-500">No members are in this meeting group yet.</p> : meeting.ownAttendance?.status ? <div className="flex items-center justify-between rounded-xl border border-white/10 p-4"><div><p className="font-medium text-white">{textOf(authUser)}</p><p className="mt-1 text-xs text-gray-500">Your final attendance</p>{meeting.ownAttendance.notes && <p className="mt-1 text-xs text-gray-400">{meeting.ownAttendance.notes}</p>}</div><Badge>{titleStatus(meeting.ownAttendance.status)}</Badge></div> : <p className="py-8 text-center text-sm text-gray-500">Your final attendance has not been marked yet.</p>}
      </Card></TabsContent>
      <TabsContent value="notes"><Card className="p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-white">Conclusion / Minutes</h2><p className="mt-1 text-xs text-gray-500">Record the key outcomes from this meeting.</p></div>{canManage && <Button size="sm" onClick={() => saveText('conclusion')} isLoading={savingField === 'conclusion'}>Save</Button>}</div>{canManage ? <Textarea className="mt-3 min-h-56" value={conclusion} onChange={(event) => setConclusion(event.target.value)} placeholder="Add the meeting conclusion or minutes" /> : <p className="mt-3 min-h-32 whitespace-pre-wrap text-sm leading-6 text-gray-300">{meeting.conclusion || (isCompleted ? 'No conclusion added.' : 'The conclusion will be available after the meeting.')}</p>}</Card></TabsContent>
    </Tabs>

    <Dialog open={Boolean(noteTarget)} onOpenChange={(open) => !open && setNoteTarget(null)}><DialogContent><DialogHeader><DialogTitle>Mark as excused</DialogTitle><DialogDescription>Add an optional note for this attendance mark.</DialogDescription></DialogHeader><Textarea maxLength={200} value={rowNote} onChange={(event) => setRowNote(event.target.value)} placeholder="Optional note" /><DialogFooter><Button variant="secondary" onClick={() => setNoteTarget(null)}>Cancel</Button><Button isLoading={savingAttendance} onClick={() => saveAttendance(noteTarget, 'excused', rowNote)}>Save as excused</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={completeOpen} onOpenChange={setCompleteOpen}><DialogContent><DialogHeader><DialogTitle>Mark meeting as completed?</DialogTitle><DialogDescription>{unmarkedCount === null ? 'Attendance must be marked for every member. Unmarked members will be counted as absent.' : `${unmarkedCount} ${unmarkedCount === 1 ? 'member is' : 'members are'} not marked. They will be counted as Absent. Continue?`}</DialogDescription></DialogHeader><DialogFooter><Button variant="secondary" onClick={() => setCompleteOpen(false)}>Go back and mark</Button><Button isLoading={completing} onClick={() => completeMeeting(unmarkedCount !== null)}>Continue</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={editOpen} onOpenChange={setEditOpen}><DialogContent><DialogHeader><DialogTitle>Edit meeting</DialogTitle><DialogDescription>Update the meeting details.</DialogDescription></DialogHeader><form onSubmit={saveEdit} className="space-y-3"><label className="block space-y-1 text-xs text-gray-400">Title<Input required value={editDraft.title || ''} onChange={(event) => setEditDraft((current) => ({ ...current, title: event.target.value }))} /></label><label className="block space-y-1 text-xs text-gray-400">Date and time<Input type="datetime-local" required value={editDraft.date || ''} onChange={(event) => setEditDraft((current) => ({ ...current, date: event.target.value }))} /></label><label className="block space-y-1 text-xs text-gray-400">End time<Input type="datetime-local" value={editDraft.endTime || ''} onChange={(event) => setEditDraft((current) => ({ ...current, endTime: event.target.value }))} /></label><label className="block space-y-1 text-xs text-gray-400">Venue or link<Input value={editDraft.venue || ''} onChange={(event) => setEditDraft((current) => ({ ...current, venue: event.target.value }))} /></label><DialogFooter><Button type="submit" isLoading={savingField === 'edit'}>Save changes</Button></DialogFooter></form></DialogContent></Dialog>
    <Dialog open={cancelOpen} onOpenChange={setCancelOpen}><DialogContent><DialogHeader><DialogTitle>Cancel meeting?</DialogTitle><DialogDescription>Group members will be notified that this meeting is cancelled.</DialogDescription></DialogHeader><DialogFooter><Button variant="secondary" onClick={() => setCancelOpen(false)}>Go back</Button><Button variant="danger" onClick={cancelMeeting}>Cancel meeting</Button></DialogFooter></DialogContent></Dialog>
  </main></TooltipProvider>;
};

const AttendanceControl = ({ row, disabled, onChoose }) => <ToggleGroup aria-label={`Attendance for ${textOf(row.user)}`} value={row.attendance?.status || ''} onValueChange={(status) => onChoose(row.user._id, status, row.attendance?.notes)} disabled={disabled} className="w-fit">
  <ToggleGroupItem value="present" className="aria-checked:border-green-500/30 aria-checked:bg-green-500/15 aria-checked:text-green-200">Present</ToggleGroupItem><ToggleGroupItem value="absent" className="aria-checked:border-red-500/30 aria-checked:bg-red-500/15 aria-checked:text-red-200">Absent</ToggleGroupItem><ToggleGroupItem value="excused" className="aria-checked:border-amber-500/30 aria-checked:bg-amber-500/15 aria-checked:text-amber-200">Excused{row.rsvp?.reason && <span className="ml-1 text-[10px] text-amber-300">Reason given</span>}</ToggleGroupItem>
</ToggleGroup>;
const RsvpLabel = ({ rsvp }) => <span className="text-xs text-gray-500">{rsvp?.status === 'attending' ? "Said they'd attend" : rsvp?.status === 'not_attending' ? "Can't attend" : 'No reply'}</span>;
const AttendanceTableRow = ({ row, disabled, onChoose }) => <TableRow><TableCell><div className="flex items-start gap-3"><Avatar className="h-9 w-9"><AvatarImage src={row.user.profilePhoto} /><AvatarFallback>{row.user.firstName?.[0]}</AvatarFallback></Avatar><div><p className="font-medium text-white">{textOf(row.user)}</p>{row.rsvp?.reason && <><p className="mt-1 text-xs text-gray-500">{row.rsvp.reason}</p><Badge className="mt-1 border-amber-500/20 bg-amber-500/10 text-amber-200">Informed in advance</Badge></>}</div></div></TableCell><TableCell><RsvpLabel rsvp={row.rsvp} /></TableCell><TableCell><AttendanceControl row={row} disabled={disabled} onChoose={onChoose} /></TableCell></TableRow>;
const AttendanceMobileRow = ({ row, disabled, onChoose }) => <div className="space-y-3 rounded-xl border border-white/10 bg-white/[.02] p-3"><div className="flex items-start gap-3"><Avatar className="h-9 w-9"><AvatarImage src={row.user.profilePhoto} /><AvatarFallback>{row.user.firstName?.[0]}</AvatarFallback></Avatar><div><p className="font-medium text-white">{textOf(row.user)}</p>{row.rsvp?.reason && <><p className="mt-1 text-xs text-gray-500">{row.rsvp.reason}</p><Badge className="mt-1 border-amber-500/20 bg-amber-500/10 text-amber-200">Informed in advance</Badge></>}</div></div><div className="flex flex-col gap-2"><RsvpLabel rsvp={row.rsvp} /><AttendanceControl row={row} disabled={disabled} onChoose={onChoose} /></div></div>;
export default MeetingDetailPage;
