import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, ClipboardList, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../services/api';
import DateTimePicker from '../../components/ui/DateTimePicker';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, MultiSelectField, Progress, SelectField, Skeleton, Switch, Textarea } from '../../components/ui/Primitives';

const statusLabels = { not_started: 'Not started', overdue: 'Overdue', submitted: 'Submitted', changes_requested: 'Changes requested', approved: 'Approved' };
const taskStatusStyle = (status) => status === 'approved' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200' : status === 'overdue' ? 'border-red-500/30 bg-red-500/15 text-red-200' : status === 'changes_requested' ? 'border-amber-500/25 bg-amber-500/10 text-amber-100' : 'border-white/15 bg-white/[.04] text-gray-300';
const blank = { title: '', description: '', groupId: '', dueAt: '', priority: 'medium', requiresSubmission: true, submissionTypeHint: '', userIds: [] };

export default function TasksPage() {
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [filterGroups, setFilterGroups] = useState([]);
  const [canCreate, setCanCreate] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState('active');
  const [groupId, setGroupId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState(blank);
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [{ data }] = await Promise.all([api.get('/tasks', { params: { status: tab, groupId } })]);
      setItems(data.data.items || []); setGroups(data.data.leadGroups || []); setFilterGroups(data.data.filterGroups || []); setCanCreate(Boolean(data.data.canCreate)); setIsSuperAdmin(Boolean(data.data.isSuperAdmin)); setIsAdmin(Boolean(data.data.isAdmin));
    } catch (cause) { setError(apiErrorMessage(cause, 'Tasks could not be loaded.')); }
    finally { setLoading(false); }
  }, [tab, groupId]);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const selectGroup = async (value) => {
    setDraft((current) => ({ ...current, groupId: value, userIds: [] })); setMembers([]);
    if (value && value !== 'club') {
      try {
        const { data } = await api.get(`/tasks/groups/${value}/members`);
        setMembers((data.data || []).filter((row) => row.userId?._id).map((row) => ({ value: row.userId._id, label: `${row.userId.firstName} ${row.userId.lastName}` })));
      } catch (cause) { toast.error(apiErrorMessage(cause, 'Could not load group members.')); }
    }
  };
  const createTask = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      await api.post('/tasks', { ...draft, groupId: draft.groupId === 'club' ? null : draft.groupId, dueAt: new Date(draft.dueAt).toISOString(), userIds: draft.userIds.length ? draft.userIds : undefined });
      toast.success('Task created'); setCreateOpen(false); setDraft(blank); await load();
    } catch (cause) { toast.error(apiErrorMessage(cause, 'Task could not be created.')); }
    finally { setSaving(false); }
  };
  const groupOptions = [...(isSuperAdmin ? [{ value: 'club', label: 'Club-wide' }] : []), ...groups.map((group) => ({ value: group._id, label: group.name }))];

  return <main className="tasks-page mx-auto max-w-6xl space-y-6 px-4 py-6 text-white sm:px-6">
    <header className="tasks-hero flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow flex items-center gap-2"><Sparkles size={13} /> Tasks / My workspace</p><h1 className="mt-1 text-3xl font-bold">Tasks &amp; Duties</h1><p className="mt-1 text-sm text-gray-400">Track your assigned tasks, submit work and stay updated.</p></div>
      {canCreate && <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus size={16} /> New Task</Button>}
    </header>

    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="tasks-tabs flex gap-2 rounded-xl border border-white/10 bg-white/[.03] p-1" role="tablist" aria-label="Task status">
        {['active', 'completed'].map((value) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`rounded-lg px-4 py-2 text-sm capitalize ${tab === value ? 'bg-red-500/15 text-white' : 'text-gray-400 hover:text-white'}`}>{value === 'active' ? 'Active' : 'Completed'}</button>)}
      </div>
      <div className="w-full sm:w-64"><SelectField value={groupId} onChange={setGroupId} options={[{ value: 'all', label: isAdmin || isSuperAdmin ? 'All tasks' : 'All my groups' }, { value: 'club', label: 'Club-wide' }, ...filterGroups.map((group) => ({ value: group._id, label: group.name }))]} placeholder="Filter by group" aria-label="Filter tasks by group" /></div>
    </div>

    {error && <Card hoverEffect={false} className="border-red-500/25 p-5 text-sm text-red-200" role="alert">{error}<button type="button" onClick={load} className="ml-3 underline">Try again</button></Card>}
    {loading ? <div className="space-y-3">{[1, 2, 3].map((key) => <Skeleton key={key} className="h-32 w-full" />)}</div> : !error && !items.length ? <Card hoverEffect={false} className="py-16 text-center"><ClipboardList className="mx-auto mb-3 text-gray-500" /><p className="text-sm text-gray-400">No tasks right now</p></Card> : <div className="space-y-3">{items.map((task) => {
      const due = task.dueAt ? new Date(task.dueAt) : null;
      const overdue = due && due < new Date() && !['closed', 'completed', 'cancelled'].includes(task.status);
      return <Card key={task._id} hoverEffect={false} className="task-card p-0 transition hover:border-red-500/25">
        <Link to={`/tasks/${task._id}`} className="block rounded-2xl p-5 outline-none focus-visible:ring-2 focus-visible:ring-red-500/50">
          <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap gap-2"><Badge>{task.group?.name || 'Club-wide'}</Badge><Badge variant="outline" className="capitalize">{task.priority}</Badge>{task.myStatus && <Badge variant="outline" className={taskStatusStyle(task.myStatus)}>{statusLabels[task.myStatus] || task.myStatus}</Badge>}</div>
            <h2 className="text-lg font-semibold text-white">{task.title}</h2>{task.description && <p className="mt-1 line-clamp-2 text-sm text-gray-400">{task.description}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-400"><span className={`inline-flex items-center gap-1.5 ${overdue ? 'text-red-300' : ''}`}><CalendarClock size={14} />{due ? `Due ${due.toLocaleString()}` : 'No deadline'}</span><span>By {task.organizer?.firstName} {task.organizer?.lastName}</span></div>
            </div><div className="flex min-w-36 flex-col items-end justify-center gap-2">{task.progress ? <><p className="text-right text-xs text-gray-400">{task.progress.submitted} of {task.progress.assigned} submitted · {task.progress.approved} approved</p><Progress value={task.progress.assigned ? task.progress.submitted / task.progress.assigned * 100 : 0} className="w-36" /><span className="mt-1 text-xs font-medium text-red-200">{task.viewOnly ? 'View' : 'Manage'} task →</span></> : <span className="rounded-full bg-red-500 px-4 py-2 text-xs font-semibold text-white">{task.myStatus === 'not_started' || task.myStatus === 'overdue' ? 'Submit work' : 'View'} →</span>}</div></div>
        </Link>
      </Card>;
    })}</div>}

    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>New task</DialogTitle><DialogDescription>Choose who needs to complete it and when it is due.</DialogDescription></DialogHeader>
      <form onSubmit={createTask} className="space-y-4"><label className="block space-y-1.5 text-sm text-gray-300">Title<Input required minLength={2} maxLength={180} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Task title" /></label>
        <label className="block space-y-1.5 text-sm text-gray-300">Description<Textarea maxLength={5000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="What needs to be done?" /></label>
        <label className="block space-y-1.5 text-sm text-gray-300">Who is this for?<SelectField value={draft.groupId} onChange={selectGroup} options={groupOptions} placeholder="Choose a group" required /></label>
        {draft.groupId && draft.groupId !== 'club' && members.length > 0 && <label className="block space-y-1.5 text-sm text-gray-300">Select specific members (optional)<MultiSelectField options={members} selectedValues={draft.userIds} onChange={(userIds) => setDraft({ ...draft, userIds })} placeholder="All group members" /></label>}
        <div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-1.5 text-sm text-gray-300">Due date and time<DateTimePicker value={draft.dueAt} onChange={(dueAt) => setDraft({ ...draft, dueAt })} placeholder="Choose a deadline" className="w-full rounded-xl border border-white/12 bg-white/[.04] py-2 pl-10 pr-3 text-sm text-white placeholder:text-gray-500" /></label><label className="block space-y-1.5 text-sm text-gray-300">Priority<SelectField value={draft.priority} onChange={(priority) => setDraft({ ...draft, priority })} options={['low', 'medium', 'high'].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} /></label></div>
        <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.025] p-3 text-sm text-gray-300"><span>Members need to upload work</span><Switch checked={draft.requiresSubmission} onCheckedChange={(requiresSubmission) => setDraft({ ...draft, requiresSubmission })} /></label>
        {draft.requiresSubmission && <label className="block space-y-1.5 text-sm text-gray-300">File type hint (optional)<Input maxLength={160} value={draft.submissionTypeHint} onChange={(event) => setDraft({ ...draft, submissionTypeHint: event.target.value })} placeholder="PDF or image" /></label>}
        <DialogFooter><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" disabled={saving || !draft.groupId || !draft.dueAt}>{saving ? 'Creating…' : 'Create task'}</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
  </main>;
}
