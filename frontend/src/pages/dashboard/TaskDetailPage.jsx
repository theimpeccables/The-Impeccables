import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Clock3, Download, ExternalLink, FileText, Paperclip, Send, UploadCloud, Users } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../services/api';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import DateTimePicker from '../../components/ui/DateTimePicker';
import { Avatar, AvatarFallback, AvatarImage, Badge, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, MultiSelectField, Progress, SelectField, Sheet, SheetContent, Skeleton, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from '../../components/ui/Primitives';

const statusLabel = (status) => ({ not_started: 'Not started', overdue: 'Overdue', submitted: 'Submitted', changes_requested: 'Changes requested', approved: 'Approved', withdrawn: 'Not started' }[status] || status);
const stateBadge = (status) => status === 'approved' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200' : status === 'overdue' ? 'border-red-500/30 bg-red-500/15 text-red-200' : status === 'changes_requested' ? 'border-amber-500/25 bg-amber-500/10 text-amber-100' : 'border-white/15 bg-white/[.04] text-gray-300';
const accepted = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip', 'application/x-zip-compressed', 'video/mp4', 'video/quicktime']);
const personName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Member';
const activeTaskStatuses = ['open', 'assigned', 'accepted', 'in_progress', 'blocked'];

export default function TaskDetailPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
  const [note, setNote] = useState('');
  const [link, setLink] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileProgress, setFileProgress] = useState([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [comment, setComment] = useState('');
  const [confirm, setConfirm] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [renderedAt] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await api.get(`/tasks/${taskId}`); setData(response.data.data); setNote(response.data.data.submission?.note || ''); setLink(response.data.data.submission?.link || ''); }
    catch (cause) { setError(apiErrorMessage(cause, 'This task could not be loaded.')); }
    finally { setLoading(false); }
  }, [taskId]);
  useEffect(() => { Promise.resolve().then(load); }, [load]);
  const task = data?.task;
  const manager = data?.canManage;
  const canReview = data?.canReview;
  const viewOnly = data?.viewOnly;
  const current = data?.submission;
  const due = task?.dueAt || task?.deadline;
  const overdue = due && new Date(due) < new Date() && task?.status === 'open';
  const filteredMembers = useMemo(() => (data?.members || []).filter((member) => {
    const name = personName(member.userId).toLowerCase();
    return name.includes(search.toLowerCase()) && (filter === 'all' || member.status === filter);
  }), [data?.members, search, filter]);

  const addFiles = (incoming) => {
    const next = [...files];
    for (const file of Array.from(incoming || [])) {
      if (!accepted.has(file.type)) { toast.error(`${file.name}: this file type is not supported.`); continue; }
      if (file.size > 25 * 1024 * 1024) { toast.error(`${file.name}: each file must be 25 MB or smaller.`); continue; }
      if (next.length >= 5) { toast.error('You can attach up to 5 files.'); break; }
      next.push(file);
    }
    setFiles(next);
  };
  const submit = async (event) => {
    event.preventDefault(); setUploading(true);
    setFileProgress(files.map(() => 0));
    const formData = new FormData(); formData.set('note', note); formData.set('link', link); files.forEach((file) => formData.append('files', file));
    const fileBytes = files.reduce((total, file) => total + file.size, 0);
    try { await api.post(`/tasks/${taskId}/submissions`, formData, { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress: (event) => {
      const ratio = event.total ? Math.min(1, event.loaded / event.total) : 0;
      setUploadProgress(Math.round(ratio * 100));
      const uploadedFileBytes = ratio * fileBytes;
      let precedingBytes = 0;
      setFileProgress(files.map((file) => {
        const percent = file.size ? Math.max(0, Math.min(100, ((uploadedFileBytes - precedingBytes) / file.size) * 100)) : 100;
        precedingBytes += file.size;
        return Math.round(percent);
      }));
    } }); setFiles([]); toast.success(current ? 'Work resubmitted' : 'Work submitted'); await load(); }
    catch (cause) { toast.error(apiErrorMessage(cause, 'Your work could not be submitted.')); }
    finally { setUploading(false); setUploadProgress(0); setFileProgress([]); }
  };
  const updateTask = async (patch) => {
    setSaving(true);
    try { await api.patch(`/tasks/${taskId}`, patch); toast.success('Task updated'); setEditOpen(false); await load(); }
    catch (cause) { toast.error(apiErrorMessage(cause, 'Task could not be updated.')); }
    finally { setSaving(false); }
  };
  const review = async (status) => {
    if (status === 'changes_requested' && !reviewComment.trim()) { toast.error('Add a comment explaining what needs to change.'); return; }
    setReviewing(true);
    try { await api.post(`/tasks/${taskId}/submissions/${selected.userId._id}/review`, { status, reviewComment }); toast.success(status === 'approved' ? 'Submission approved' : 'Changes requested'); setSelected(null); setReviewComment(''); await load(); }
    catch (cause) { toast.error(apiErrorMessage(cause, 'Review could not be saved.')); }
    finally { setReviewing(false); }
  };
  const sendComment = async (event) => {
    event.preventDefault(); if (!comment.trim()) return;
    try { await api.post(`/tasks/${taskId}/comments`, { body: comment }); setComment(''); toast.success('Comment added'); await load(); }
    catch (cause) { toast.error(apiErrorMessage(cause, 'Comment could not be added.')); }
  };
  const remind = async () => {
    try { const result = await api.post(`/tasks/${taskId}/remind`); toast.success(`Reminder sent to ${result.data.data.notified} member${result.data.data.notified === 1 ? '' : 's'}`); }
    catch (cause) { toast.error(apiErrorMessage(cause, 'Reminder could not be sent.')); }
  };
  const openReassign = async () => {
    try {
      const { data: response } = task.groupId?._id ? await api.get(`/tasks/groups/${task.groupId._id}/members`) : await api.get('/members/directory', { params: { limit: 100 } });
      const rows = response.data || [];
      const options = rows.map((row) => {
        const person = row.userId || row;
        return { value: person._id, label: personName(person) };
      }).filter((option) => option.value);
      setAssigneeOptions(options);
      setAssigneeIds((data.members || []).map((member) => member.userId?._id).filter(Boolean));
      setAssignOpen(true);
    } catch (cause) { toast.error(apiErrorMessage(cause, 'Members could not be loaded.')); }
  };
  const reassign = async () => {
    try { await api.put(`/tasks/${taskId}/assignees`, { userIds: assigneeIds }); toast.success('Task members updated'); setAssignOpen(false); await load(); }
    catch (cause) { toast.error(apiErrorMessage(cause, 'Task members could not be updated.')); }
  };
  const deleteTask = async () => {
    try { await api.delete(`/tasks/${taskId}`); toast.success('Task deleted'); navigate('/dashboard/tasks'); }
    catch (cause) { toast.error(apiErrorMessage(cause, 'Task could not be deleted.')); }
  };
  const closeTask = async (status) => {
    await updateTask({ status }); setConfirm('');
    if (status === 'cancelled') toast.success('Task cancelled'); else toast.success('Task closed');
  };
  const approveAll = async () => {
    try { const result = await api.post(`/tasks/${taskId}/submissions/approve-all`); toast.success(`${result.data.data.approved} submissions approved`); setConfirm(''); await load(); }
    catch (cause) { toast.error(apiErrorMessage(cause, 'Submissions could not be approved.')); }
  };

  if (loading) return <div className="tasks-detail mx-auto max-w-6xl space-y-4 px-4 py-8"><Skeleton className="h-9 w-1/3" /><Skeleton className="h-36 w-full" /><Skeleton className="h-72 w-full" /></div>;
  if (error || !task) return <main className="tasks-detail mx-auto max-w-4xl px-4 py-12"><Card hoverEffect={false} className="text-center"><p className="text-sm text-red-200">{error || 'This task was not found.'}</p><Button className="mt-4" onClick={() => navigate('/dashboard/tasks')}>Back to tasks</Button></Card></main>;

  const ownView = !manager && !viewOnly;
  const status = current?.status || (overdue ? 'overdue' : 'not_started');
  const dueText = due ? new Date(due).toLocaleString() : 'No deadline';
  const countdown = due ? Math.ceil((new Date(due).getTime() - renderedAt) / 86400000) : null;

  return <main className="tasks-detail mx-auto max-w-6xl space-y-6 px-4 py-6 text-white sm:px-6">
    <Link to="/dashboard/tasks" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"><ArrowLeft size={16} /> Back to Tasks</Link>
    <header className="task-detail-hero flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap gap-2"><Badge>{task.groupId?.name || task.domain?.name || 'Club-wide'}</Badge><Badge variant="outline" className="capitalize">{task.priority}</Badge>{viewOnly && <Badge variant="outline">View only</Badge>}<Badge variant="outline" className={stateBadge(status)}>{statusLabel(status)}</Badge></div>
        <h1 className="text-3xl font-bold">{task.title}</h1><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-400"><span className={`inline-flex items-center gap-2 ${overdue ? 'text-red-300' : ''}`}><CalendarClock size={15} />Due {dueText}{countdown !== null ? countdown >= 0 ? ` · Due in ${countdown} day${countdown === 1 ? '' : 's'}` : ` · ${Math.abs(countdown)} day${Math.abs(countdown) === 1 ? '' : 's'} overdue` : ''}</span><span><Users className="mr-1 inline" size={15} />{task.organizerId?.firstName || task.createdBy?.firstName} {task.organizerId?.lastName || task.createdBy?.lastName}</span></div>
      </div>
      {(manager || viewOnly) && <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={remind}>Send reminder</Button>{manager && data.isSuperAdmin && <Button variant="outline" onClick={openReassign}>Reassign</Button>}{manager && <Button variant="secondary" onClick={() => setEditOpen(true)}>Edit task</Button>}{manager && activeTaskStatuses.includes(task.status) && <Button variant="primary" onClick={() => setConfirm('close')}>Close task</Button>}{manager && task.status !== 'cancelled' && <Button variant="outline" onClick={() => setConfirm('cancel')}>Cancel task</Button>}{data.canDelete && <Button variant="danger" onClick={() => setConfirm('delete')}>Delete</Button>}</div>}
    </header>
    {task.description && <Card hoverEffect={false} className="task-description-card p-5"><p className="whitespace-pre-wrap text-sm leading-6 text-gray-300">{task.description}</p>{task.submissionTypeHint && <p className="mt-3 text-xs text-gray-500">File type: {task.submissionTypeHint}</p>}</Card>}

    {ownView ? <Card hoverEffect={false} className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Your submission</h2><p className="mt-1 text-sm text-gray-400">{!activeTaskStatuses.includes(task.status) ? 'This task is no longer accepting submissions.' : task.requiresSubmission ? 'Upload files or add a link to your work.' : 'Add an optional update for the organizer.'}</p></div><Badge className={stateBadge(status)}>{statusLabel(status)}</Badge></div>
      {current?.status === 'changes_requested' && <div className="rounded-xl border border-amber-500/25 bg-amber-500/[.08] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Changes requested</p><p className="mt-2 whitespace-pre-wrap text-sm text-gray-200">{current.reviewComment || 'Please update and resubmit your work.'}</p></div>}
      {current?.status === 'approved' ? <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[.07] p-4"><p className="font-medium text-emerald-200">Your work was approved</p>{current.reviewComment && <p className="mt-2 text-sm text-gray-300">{current.reviewComment}</p>}</div> : <>
        {current && current.status !== 'withdrawn' && <div className="space-y-3 rounded-xl border border-white/10 bg-white/[.025] p-4"><div className="flex flex-wrap items-center gap-2"><Badge className={stateBadge(current.status)}>{statusLabel(current.status)}</Badge>{current.isLate && <Badge variant="destructive">Late</Badge>}<span className="text-xs text-gray-500">Submitted {new Date(current.submittedAt).toLocaleString()}</span></div>{current.note && <p className="whitespace-pre-wrap text-sm text-gray-300">{current.note}</p>}{current.link && <a href={current.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-red-200 hover:text-white"><ExternalLink size={14} />Open link</a>}{current.files?.map((file) => <div key={file._id} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm"><a href={file.url} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-2 text-gray-200 hover:text-white"><FileText size={15} /><span className="truncate">{file.fileName}</span></a><a href={file.downloadUrl || file.url} target="_blank" rel="noreferrer" aria-label={`Download ${file.fileName}`} className="text-gray-400 hover:text-red-200"><Download size={14} /></a></div>)}
          {(current.history || []).length > 0 && <div className="border-t border-white/10 pt-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Previous versions</p>{current.history.map((version) => <div key={version.version} className="flex flex-wrap items-center justify-between gap-2 py-1 text-xs text-gray-400"><span>Version {version.version} · {statusLabel(version.status)}</span><span>{new Date(version.submittedAt).toLocaleString()}</span>{version.files?.map((file) => <a key={file._id} href={file.url} target="_blank" rel="noreferrer" className="basis-full text-red-200 hover:text-white">{file.fileName} ↗</a>)}</div>)}</div>}
        </div>}
        {activeTaskStatuses.includes(task.status) && status !== 'approved' && <form onSubmit={submit} className="space-y-4">
          <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[.02] p-5 text-center hover:border-red-500/40"><UploadCloud className="text-red-300" /><span className="text-sm text-gray-200">Choose files</span><span className="text-xs text-gray-500">Images, PDF, Word, PowerPoint, Excel, ZIP, MP4 or MOV · up to 5 files, 25 MB each</span><input type="file" multiple accept="image/*,.pdf,.docx,.pptx,.xlsx,.zip,.mp4,.mov" className="sr-only" onChange={(event) => addFiles(event.target.files)} /></label>
          {files.map((file, index) => <div key={`${file.name}-${file.lastModified}`} className="space-y-2 rounded-lg border border-white/10 px-3 py-2 text-sm"><div className="flex items-center gap-3"><Paperclip size={14} className="text-red-300" /><span className="min-w-0 flex-1 truncate">{file.name}</span><span className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</span>{!uploading && <button type="button" onClick={() => setFiles((currentFiles) => currentFiles.filter((_, fileIndex) => fileIndex !== index))} className="text-gray-400 hover:text-red-300" aria-label={`Remove ${file.name}`}>×</button>}</div>{uploading && <Progress value={fileProgress[index] || 0} aria-label={`Uploading ${file.name}`} />}</div>)}
          <label className="block space-y-1.5 text-sm text-gray-300">Note (optional)<Textarea maxLength={5000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a note for the organizer" /></label><label className="block space-y-1.5 text-sm text-gray-300">Link (optional)<Input type="url" value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://…" /></label>
          <div className="flex flex-wrap items-center justify-end gap-3">{uploading && <span className="text-xs text-gray-400">Uploading {uploadProgress}%</span>}{current?.status === 'submitted' && <Button type="button" variant="outline" onClick={async () => { try { await api.post(`/tasks/${taskId}/submissions/withdraw`); toast.success('Submission withdrawn'); await load(); } catch (cause) { toast.error(apiErrorMessage(cause, 'Could not withdraw submission.')); } }}>Withdraw</Button>}<Button type="submit" disabled={uploading || (!files.length && !link.trim() && task.requiresSubmission)} isLoading={uploading}>{current ? 'Resubmit work' : 'Submit work'}</Button></div>
        </form>}
      </>}
    </Card> : <Tabs defaultValue="overview" className="w-full"><TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="submissions">Submissions</TabsTrigger><TabsTrigger value="activity">Activity</TabsTrigger></TabsList>
      <TabsContent value="overview"><Card hoverEffect={false} className="space-y-4"><div><h2 className="font-semibold">Task details</h2><p className="mt-1 text-sm text-gray-400">Due {dueText}</p></div>{task.description && <p className="whitespace-pre-wrap text-sm leading-6 text-gray-300">{task.description}</p>}{!task.description && <p className="text-sm text-gray-500">No description provided.</p>}{task.submissionTypeHint && <p className="text-sm text-gray-400">Expected file type: {task.submissionTypeHint}</p>}{viewOnly && <p className="text-xs text-gray-500">You can read submissions and comments, and send a reminder.</p>}</Card></TabsContent>
      <TabsContent value="submissions"><Card hoverEffect={false} className="space-y-4 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Submissions</h2><p className="mt-1 text-xs text-gray-400">Not submitted {data.members.filter((member) => ['not_started', 'overdue'].includes(member.status)).length} · Submitted {data.members.filter((member) => member.status === 'submitted').length} · Changes requested {data.members.filter((member) => member.status === 'changes_requested').length} · Approved {data.members.filter((member) => member.status === 'approved').length}</p></div><div className="flex flex-wrap gap-2">{canReview && <Button variant="outline" onClick={() => setConfirm('remind')}>Send reminder to those who haven't submitted</Button>}{canReview && <Button variant="secondary" onClick={() => setConfirm('approve-all')}>Approve all submitted</Button>}</div></div>
        <div className="flex flex-wrap gap-2"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name" className="max-w-xs" /><SelectField value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All statuses' }, ...['not_started', 'overdue', 'submitted', 'changes_requested', 'approved'].map((value) => ({ value, label: statusLabel(value) }))]} className="max-w-52" /></div>
        <div className="hidden md:block"><Table><TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Status</TableHead><TableHead>Submitted</TableHead><TableHead>Files</TableHead><TableHead>Action</TableHead></TableRow></TableHeader><TableBody>{filteredMembers.map((member) => <TableRow key={member._id}><TableCell><div className="flex items-center gap-3"><Avatar className="h-9 w-9"><AvatarImage src={member.userId?.profilePhoto || member.userId?.avatarUrl} /><AvatarFallback>{personName(member.userId).slice(0, 1)}</AvatarFallback></Avatar><span>{personName(member.userId)}</span></div></TableCell><TableCell><Badge variant="outline" className={stateBadge(member.status)}>{statusLabel(member.status)}</Badge></TableCell><TableCell className="text-xs text-gray-400">{member.submission ? <>{new Date(member.submission.submittedAt).toLocaleString()}{member.submission.isLate && <Badge variant="destructive" className="ml-2">Late</Badge>}</> : '—'}</TableCell><TableCell className="text-gray-400">{member.submission?.files?.length || 0}</TableCell><TableCell>{member.submission && member.submission.status !== 'withdrawn' ? <Button size="sm" variant="outline" onClick={() => { setSelected(member.submission); setReviewComment(member.submission.reviewComment || ''); }}>Review</Button> : <span className="text-xs text-gray-500">—</span>}</TableCell></TableRow>)}</TableBody></Table></div>
        <div className="space-y-3 md:hidden">{filteredMembers.map((member) => <article key={member._id} className="rounded-xl border border-white/10 p-4"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Avatar className="h-9 w-9"><AvatarImage src={member.userId?.profilePhoto || member.userId?.avatarUrl} /><AvatarFallback>{personName(member.userId).slice(0, 1)}</AvatarFallback></Avatar><span className="text-sm font-medium">{personName(member.userId)}</span></div><Badge className={stateBadge(member.status)}>{statusLabel(member.status)}</Badge></div><p className="mt-2 text-xs text-gray-400">{member.submission ? `Submitted ${new Date(member.submission.submittedAt).toLocaleString()} · ${member.submission.files?.length || 0} files${member.submission.isLate ? ' · Late' : ''}` : 'No submission yet'}</p>{member.submission && <Button size="sm" variant="outline" className="mt-3" onClick={() => { setSelected(member.submission); setReviewComment(member.submission.reviewComment || ''); }}>Review</Button>}</article>)}</div>
        {!filteredMembers.length && <p className="py-10 text-center text-sm text-gray-500">No assigned members match.</p>}
      </Card></TabsContent>
      <TabsContent value="activity"><div className="grid gap-4 lg:grid-cols-2"><Card hoverEffect={false}><h2 className="mb-4 font-semibold">Comments</h2><div className="max-h-80 space-y-3 overflow-y-auto">{data.comments.map((item) => <div key={item._id} className="rounded-xl bg-white/[.03] p-3"><p className="text-xs font-medium text-gray-300">{personName(item.userId)} <span className="ml-2 font-normal text-gray-500">{new Date(item.createdAt).toLocaleString()}</span></p><p className="mt-2 whitespace-pre-wrap text-sm text-gray-200">{item.body}</p></div>)}{!data.comments.length && <p className="text-sm text-gray-500">No comments yet.</p>}</div>{(manager || viewOnly) && <form onSubmit={sendComment} className="mt-4 flex gap-2"><Input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write a comment" maxLength={3000} /><Button type="submit" size="sm" disabled={!comment.trim()} aria-label="Send comment"><Send size={15} /></Button></form>}</Card><Card hoverEffect={false}><h2 className="mb-4 font-semibold">Timeline</h2><div className="space-y-4 text-sm text-gray-400">{data.activity.map((entry) => <p key={entry._id} className="flex gap-3"><Clock3 size={15} className="mt-0.5 shrink-0 text-red-300" /><span><span className="text-gray-200">{personName(entry.changedBy)}</span>: {entry.note || `Status changed to ${entry.toStatus}`} <span className="text-xs text-gray-500">· {new Date(entry.changedAt).toLocaleString()}</span></span></p>)}{!data.activity.length && <p>No activity yet.</p>}</div></Card></div></TabsContent>
    </Tabs>}

    <Dialog open={editOpen} onOpenChange={setEditOpen}><DialogContent><DialogHeader><DialogTitle>Edit task</DialogTitle><DialogDescription>Update task details or deadline.</DialogDescription></DialogHeader><EditTaskForm task={task} groups={data.groupOptions || []} isSuperAdmin={data.isSuperAdmin} saving={saving} onSave={updateTask} onCancel={() => setEditOpen(false)} /></DialogContent></Dialog>
    <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><SheetContent className="w-[min(560px,100vw)] overflow-y-auto border-l border-white/10 bg-[#0b0b0f] p-5 text-white sm:p-7"><div className="space-y-5"><div><p className="text-xs uppercase tracking-[.18em] text-red-300">Review submission</p><DialogTitle className="mt-1 text-xl font-semibold">{personName(selected?.userId)}</DialogTitle><DialogDescription className="mt-1 text-sm text-gray-400">Version {selected?.version} · {selected?.submittedAt && new Date(selected.submittedAt).toLocaleString()}</DialogDescription></div>{selected?.isLate && <Badge variant="destructive">Late submission</Badge>}{selected?.note && <Card hoverEffect={false}><p className="whitespace-pre-wrap text-sm text-gray-300">{selected.note}</p></Card>}{selected?.link && <a href={selected.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-red-200"><ExternalLink size={15} />Open submission link</a>}<div className="space-y-3">{selected?.files?.map((file) => <div key={file._id} className="overflow-hidden rounded-xl border border-white/10 bg-black/40"><a href={file.url} target="_blank" rel="noreferrer" className="block">{file.fileType.startsWith('image/') ? <img src={file.url} alt={file.fileName} className="max-h-64 w-full object-contain" /> : file.fileType === 'application/pdf' ? <iframe src={file.url} title={file.fileName} className="h-64 w-full" /> : null}<span className="flex items-center gap-2 p-3 text-sm text-gray-200"><FileText size={15} />{file.fileName}</span></a><a href={file.downloadUrl || file.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 border-t border-white/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/[.05]"><Download size={14} />Download file</a></div>)}{!selected?.files?.length && <p className="text-sm text-gray-500">No uploaded files.</p>}</div>{(selected?.history || []).length > 0 && <div><h3 className="mb-2 text-sm font-semibold">Version history</h3>{selected.history.map((version) => <div key={version.version} className="border-t border-white/10 py-2 text-xs text-gray-400"><div className="flex justify-between"><span>Version {version.version} · {statusLabel(version.status)}</span><span>{new Date(version.submittedAt).toLocaleString()}</span></div>{version.files?.map((file) => <a key={file._id} href={file.url} target="_blank" rel="noreferrer" className="mt-1 block text-red-200">{file.fileName} ↗</a>)}</div>)}</div>}{canReview && selected?.status !== 'approved' && <><label className="block space-y-1.5 text-sm text-gray-300">Comment{selected?.status !== 'changes_requested' && ' (required for changes)'}<Textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} placeholder="Explain what should change" maxLength={3000} /></label><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" className="border-amber-500/35 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20" disabled={reviewing || !reviewComment.trim()} onClick={() => review('changes_requested')}>Request changes</Button><Button variant="secondary" className="border-emerald-500/30 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25" disabled={reviewing} onClick={() => review('approved')}>Approve</Button></div></>}</div></SheetContent></Sheet>

    <Dialog open={assignOpen} onOpenChange={setAssignOpen}><DialogContent><DialogHeader><DialogTitle>Reassign task</DialogTitle><DialogDescription>Choose which members are responsible for this task.</DialogDescription></DialogHeader><MultiSelectField options={assigneeOptions} selectedValues={assigneeIds} onChange={setAssigneeIds} placeholder="Choose members" /><DialogFooter><Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button><Button onClick={reassign} disabled={!assigneeIds.length}>Save members</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm('')}><DialogContent><DialogHeader><DialogTitle>{confirm === 'approve-all' ? 'Approve all submitted work?' : confirm === 'remind' ? 'Send a reminder?' : confirm === 'cancel' ? 'Cancel this task?' : confirm === 'delete' ? 'Delete this task?' : 'Close this task?'}</DialogTitle><DialogDescription>{confirm === 'approve-all' ? 'Every submission currently waiting for review will be approved.' : confirm === 'remind' ? 'A notification will go only to assigned members who have not submitted.' : confirm === 'delete' ? 'The task, submissions, comments and uploaded files will be deleted.' : 'Members will no longer be able to submit work.'}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setConfirm('')}>Go back</Button><Button variant={['cancel', 'delete'].includes(confirm) ? 'danger' : 'primary'} onClick={() => confirm === 'approve-all' ? approveAll() : confirm === 'remind' ? (setConfirm(''), remind()) : confirm === 'delete' ? deleteTask() : closeTask(confirm === 'cancel' ? 'cancelled' : 'closed')}>Confirm</Button></DialogFooter></DialogContent></Dialog>
  </main>;
}

function EditTaskForm({ task, groups, isSuperAdmin, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ title: task.title || '', description: task.description || '', groupId: task.groupId?._id || (isSuperAdmin ? 'club' : ''), dueAt: task.dueAt || task.deadline ? new Date(task.dueAt || task.deadline).toISOString() : '', priority: task.priority || 'medium', requiresSubmission: task.requiresSubmission !== false, submissionTypeHint: task.submissionTypeHint || '' });
  const groupOptions = [...(isSuperAdmin ? [{ value: 'club', label: 'Club-wide' }] : []), ...groups.map((group) => ({ value: group._id, label: group.name }))];
  return <form onSubmit={(event) => { event.preventDefault(); onSave({ ...form, groupId: form.groupId === 'club' ? null : form.groupId, dueAt: new Date(form.dueAt).toISOString() }); }} className="space-y-4"><label className="block space-y-1.5 text-sm text-gray-300">Title<Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label><label className="block space-y-1.5 text-sm text-gray-300">Description<Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label className="block space-y-1.5 text-sm text-gray-300">Who is this for?<SelectField value={form.groupId} onChange={(groupId) => setForm({ ...form, groupId })} options={groupOptions} placeholder="Choose a group" /></label><label className="block space-y-1.5 text-sm text-gray-300">Due date and time<DateTimePicker value={form.dueAt} onChange={(dueAt) => setForm({ ...form, dueAt: dueAt ? new Date(dueAt).toISOString() : '' })} placeholder="Choose a deadline" className="w-full rounded-xl border border-white/12 bg-white/[.04] py-2 pl-10 pr-3 text-sm text-white placeholder:text-gray-500" /></label><label className="block space-y-1.5 text-sm text-gray-300">Priority<SelectField value={form.priority} onChange={(priority) => setForm({ ...form, priority })} options={['low', 'medium', 'high'].map((value) => ({ value, label: value }))} /></label><label className="block space-y-1.5 text-sm text-gray-300">File type hint<Input value={form.submissionTypeHint} onChange={(event) => setForm({ ...form, submissionTypeHint: event.target.value })} /></label><label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.025] p-3 text-sm text-gray-300"><span>Members need to upload work</span><Switch checked={form.requiresSubmission} onCheckedChange={(requiresSubmission) => setForm({ ...form, requiresSubmission })} /></label><DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving || !form.dueAt || !form.groupId}>Save changes</Button></DialogFooter></form>;
}
