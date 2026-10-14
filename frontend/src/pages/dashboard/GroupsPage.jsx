import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Plus, Users, Search, MoreHorizontal, UserPlus, ShieldCheck, UserRound, LogOut, Check, X, Archive } from 'lucide-react';
import api, { apiErrorMessage } from '../../services/api';
import { notify } from '../../utils/notify';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Textarea, Badge, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Popover, PopoverTrigger, PopoverContent, Command, CommandInput, CommandList, CommandItem, CommandEmpty, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, Avatar, AvatarImage, AvatarFallback, Table, TableHeader, TableHead, TableBody, TableCell, TableRow, Skeleton, Checkbox, SelectField } from '../../components/ui/Primitives';

const errorText = (error, fallback) => apiErrorMessage(error, fallback);
const GroupTile = ({ group, children }) => <Card className="group-tile flex flex-wrap items-center justify-between gap-4 p-5"><div className="flex min-w-0 items-center gap-4"><span className="group-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-300"><Users size={20} /></span><div className="min-w-0"><h2 className="truncate font-semibold text-white">{group.name}</h2><p className="mt-1 text-xs text-gray-400">{group.memberCount || 0} members · {group.description || group.type}</p></div></div><div className="flex items-center gap-2">{group.myRole === 'lead' && <Badge>Lead</Badge>}{children}</div></Card>;

const GroupsPage = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [query] = useSearchParams();
  const { role } = useSelector((state) => state.auth);
  const admin = ['admin', 'super_admin'].includes(role);
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', type: 'custom', acceptsRequests: true });
  const [requestGroup, setRequestGroup] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [activeTab, setActiveTab] = useState(query.get('tab') || 'members');
  const [saving, setSaving] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/groups'); setGroups(data.data || []); setError(''); }
    catch (e) { setError(errorText(e, 'Groups could not be loaded.')); }
    finally { setLoading(false); }
  }, []);
  const loadDetail = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const [{ data: all }, { data: memberRows }, { data: requestRows }] = await Promise.all([
        api.get('/groups'), api.get(`/groups/${groupId}/members`), api.get(`/groups/${groupId}/requests`),
      ]);
      setGroups(all.data || []); setMembers(memberRows.data || []); setRequests(requestRows.data || []); setError('');
    } catch (e) { setError(errorText(e, 'This group could not be loaded.')); }
    finally { setLoading(false); }
  }, [groupId]);
  useEffect(() => { const timer = window.setTimeout(() => { if (groupId) void loadDetail(); else void loadGroups(); }, 0); return () => window.clearTimeout(timer);
  }, [groupId, loadDetail, loadGroups]);
  const group = groups.find((item) => String(item._id) === String(groupId));
  const manager = admin || group?.myRole === 'lead';
  const managerView = admin || groups.some((item) => item.myRole === 'lead');
  const myGroups = groups.filter((item) => item.myRole);
  const browsable = groups.filter((item) => item.acceptsRequests && !item.isArchived);
  const decidedRequests = requests.filter((row) => row.status !== 'pending');

  const create = async (event) => {
    event.preventDefault(); setCreating(true);
    try { await api.post('/groups', newGroup); setCreateOpen(false); setNewGroup({ name: '', description: '', type: 'custom', acceptsRequests: true }); notify({ type: 'success', title: 'Group created', message: 'The new group is ready.' }); await loadGroups(); }
    catch (e) { setError(errorText(e, 'The group could not be created.')); }
    finally { setCreating(false); }
  };
  const join = async () => {
    if (!requestGroup) return; setSaving(true);
    try { await api.post(`/groups/${requestGroup._id}/requests`, { message: requestMessage }); setRequestGroup(null); setRequestMessage(''); notify({ type: 'success', title: 'Request sent', message: `Your request to join ${requestGroup.name} was sent.` }); await loadGroups(); }
    catch (e) { notify({ type: 'error', title: 'Request not sent', message: errorText(e, 'Please try again.') }); }
    finally { setSaving(false); }
  };
  const manageRequest = async (requestId, status) => {
    try { await api.patch(`/groups/requests/${requestId}`, { status }); await loadDetail(); notify({ type: 'success', title: status === 'approved' ? 'Request approved' : 'Request rejected', message: 'The member has been notified.' }); }
    catch (e) { notify({ type: 'error', title: 'Could not update request', message: errorText(e, 'Please try again.') }); }
  };
  const fetchUsers = useCallback(async () => {
    try { const { data } = await api.get('/members/directory', { params: { page: 1, limit: 100, search: memberSearch } }); setUsers(data.data || []); }
    catch (e) { notify({ type: 'error', title: 'Members unavailable', message: errorText(e, 'Could not load members.') }); }
  }, [memberSearch]);
  useEffect(() => { if (!addOpen) return undefined; const timer = window.setTimeout(() => { void fetchUsers(); }, 0); return () => window.clearTimeout(timer);
  }, [addOpen, fetchUsers]);
  const addMembers = async () => {
    if (!selectedUsers.length) return; setSaving(true);
    try { await api.post(`/groups/${groupId}/members`, { userIds: selectedUsers }); setSelectedUsers([]); setAddOpen(false); await loadDetail(); notify({ type: 'success', title: 'Members added', message: 'Group membership is updated.' }); }
    catch (e) { notify({ type: 'error', title: 'Could not add members', message: errorText(e, 'Please try again.') }); }
    finally { setSaving(false); }
  };
  const setMemberRole = async (userId, nextRole) => {
    try { await api.patch(`/groups/${groupId}/members/${userId}`, { role: nextRole }); await loadDetail(); }
    catch (e) { notify({ type: 'error', title: 'Could not update member', message: errorText(e, 'Please try again.') }); }
  };
  const removeMember = (member) => setRemoveTarget(member);
  const confirmRemoveMember = async () => {
    if (!removeTarget) return;
    try { await api.delete(`/groups/${groupId}/members/${removeTarget.userId._id}`); setRemoveTarget(null); await loadDetail(); }
    catch (e) { notify({ type: 'error', title: 'Could not remove member', message: errorText(e, 'Please try again.') }); }
  };
  const leave = async (groupRow) => {
    try { await api.delete(`/groups/${groupRow._id}/leave`); await loadGroups(); notify({ type: 'success', title: 'Left group', message: `You left ${groupRow.name}.` }); }
    catch (e) { notify({ type: 'error', title: 'Could not leave group', message: errorText(e, 'Please try again.') }); }
  };
  const cancelRequest = async (requestId) => { try { await api.delete(`/groups/requests/${requestId}`); await loadGroups(); } catch (e) { notify({ type: 'error', title: 'Could not cancel request', message: errorText(e, 'Please try again.') }); } };
  const saveSettings = async (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    try { await api.patch(`/groups/${groupId}`, { name: form.get('name'), description: form.get('description'), acceptsRequests: form.get('acceptsRequests') === 'on' }); await loadDetail(); notify({ type: 'success', title: 'Group updated', message: 'Settings have been saved.' }); }
    catch (e) { notify({ type: 'error', title: 'Could not save group', message: errorText(e, 'Please try again.') }); }
  };
  const archive = async () => {
    try { await api.patch(`/groups/${groupId}`, { isArchived: true }); notify({ type: 'success', title: 'Group archived', message: 'The group is now archived.' }); navigate('/dashboard/groups'); }
    catch (e) { notify({ type: 'error', title: 'Could not archive group', message: errorText(e, 'Please try again.') }); }
  };
  const archiveGroupRow = async (groupRow) => {
    try { await api.patch(`/groups/${groupRow._id}`, { isArchived: true }); await loadGroups(); notify({ type: 'success', title: 'Group archived', message: `${groupRow.name} is now archived.` }); }
    catch (e) { notify({ type: 'error', title: 'Could not archive group', message: errorText(e, 'Please try again.') }); }
  };
  const memberIds = useMemo(() => new Set(members.map((row) => String(row.userId?._id))), [members]);
  const selectableUsers = users.filter((user) => !memberIds.has(String(user.id)));

  if (groupId) return <main className="groups-page groups-detail mx-auto max-w-6xl space-y-6 text-gray-100">
    {error && <Card role="alert" className="border-red-500/30 p-4 text-sm text-red-200">{error} <Button size="sm" variant="outline" className="ml-3" onClick={loadDetail}>Try again</Button></Card>}
    {loading ? <div className="space-y-4"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-80 w-full" /></div> : !group ? <Card className="p-10 text-center"><p className="text-gray-300">This group is unavailable.</p><Link className="mt-4 inline-flex rounded-xl bg-[#ff2a2a] px-4 py-2 text-sm text-white" to="/dashboard/groups">Back to Groups</Link></Card> : <>
      <header className="group-hero flex flex-wrap items-end justify-between gap-4"><div><Link to="/dashboard/groups" className="text-xs text-red-300 hover:text-red-200">Groups</Link><h1 className="mt-2 text-3xl font-bold text-white">{group.name}</h1><p className="mt-2 text-sm text-gray-400">{group.memberCount} members</p></div>{manager && <Button icon={UserPlus} onClick={() => setAddOpen(true)}>Add members</Button>}</header>
      {manager ? <Tabs value={activeTab} onValueChange={setActiveTab}><TabsList><TabsTrigger value="members">Members</TabsTrigger><TabsTrigger value="requests">Requests {group.pendingRequests > 0 && <Badge className="ml-2">{group.pendingRequests}</Badge>}</TabsTrigger><TabsTrigger value="settings">Settings</TabsTrigger></TabsList>
        <TabsContent value="members"><Card className="p-0"><Table><TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Joined</TableHead><TableHead /></TableRow></TableHeader><TableBody>{members.map((row) => <TableRow key={row._id}><TableCell><span className="flex items-center gap-3"><Avatar className="h-9 w-9"><AvatarImage src={row.userId?.profilePhoto || undefined} /><AvatarFallback>{row.userId?.firstName?.[0]}</AvatarFallback></Avatar><span>{row.userId?.firstName} {row.userId?.lastName}</span></span></TableCell><TableCell>{row.userId?.email}</TableCell><TableCell><Badge variant={row.role === 'lead' ? 'default' : 'outline'}>{row.role === 'lead' ? 'Lead' : 'Member'}</Badge></TableCell><TableCell>{new Date(row.joinedAt).toLocaleDateString()}</TableCell><TableCell><DropdownMenu><DropdownMenuTrigger aria-label="Member actions" className="rounded-lg p-2 text-gray-400 hover:bg-white/5"><MoreHorizontal size={17} /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setMemberRole(row.userId._id, row.role === 'lead' ? 'member' : 'lead')}>{row.role === 'lead' ? <><UserRound size={15} /> Make member</> : <><ShieldCheck size={15} /> Make lead</>}</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-red-200" onSelect={() => removeMember(row)}><LogOut size={15} /> Remove</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}{!members.length && <TableRow><TableCell colSpan={5} className="py-10 text-center text-gray-500">No members in this group yet.</TableCell></TableRow>}</TableBody></Table></Card></TabsContent>
        <TabsContent value="requests"><Card className="space-y-3 p-5">{requests.filter((row) => row.status === 'pending').map((request) => <div key={request._id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[.03] p-4"><div className="flex min-w-0 items-center gap-3"><Avatar className="h-10 w-10"><AvatarImage src={request.userId?.profilePhoto || undefined} /><AvatarFallback>{request.userId?.firstName?.[0]}</AvatarFallback></Avatar><div><p className="font-medium text-white">{request.userId?.firstName} {request.userId?.lastName}</p><p className="text-xs text-gray-400">{request.message || 'No message'} · {new Date(request.createdAt).toLocaleDateString()}</p></div></div><div className="flex gap-2"><Button size="sm" onClick={() => manageRequest(request._id, 'approved')}><Check size={15} /> Approve</Button><Button size="sm" variant="outline" onClick={() => manageRequest(request._id, 'rejected')}><X size={15} /> Reject</Button></div></div>)}{!requests.some((row) => row.status === 'pending') && <p className="py-6 text-center text-sm text-gray-400">No pending requests.</p>}{decidedRequests.length > 0 && <div className="border-t border-white/10 pt-4"><h3 className="mb-3 text-xs uppercase tracking-wider text-gray-500">Recently decided</h3>{decidedRequests.slice(0, 8).map((request) => <p key={request._id} className="py-1 text-xs text-gray-500">{request.userId?.firstName} {request.userId?.lastName} · {request.status}</p>)}</div>}</Card></TabsContent>
        <TabsContent value="settings"><Card className="max-w-2xl p-5"><form onSubmit={saveSettings} className="space-y-4"><label className="block text-sm text-gray-300">Group name<Input name="name" required minLength={2} maxLength={80} defaultValue={group.name} /></label><label className="block text-sm text-gray-300">Description<Textarea name="description" maxLength={500} defaultValue={group.description} /></label><label className="flex items-center gap-3 text-sm text-gray-300"><Checkbox name="acceptsRequests" defaultChecked={group.acceptsRequests} /> Allow join requests</label><Button type="submit">Save changes</Button></form><div className="mt-6 border-t border-white/10 pt-5"><Button variant="outline" className="text-red-200" onClick={archive}><Archive size={15} /> Archive group</Button></div></Card></TabsContent>
      </Tabs> : <Card className="p-6 text-sm text-gray-300">You are not a lead for this group.</Card>}
    </>}
    <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}><DialogContent><DialogHeader><DialogTitle>Remove this member?</DialogTitle><DialogDescription>{removeTarget?.userId?.firstName} will no longer receive this group’s meeting updates.</DialogDescription></DialogHeader><DialogFooter><Button variant="secondary" onClick={() => setRemoveTarget(null)}>Keep member</Button><Button variant="danger" onClick={confirmRemoveMember}>Remove member</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent><DialogHeader><DialogTitle>Add members</DialogTitle><DialogDescription>Search and select members to add to {group?.name}.</DialogDescription></DialogHeader><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-between">{selectedUsers.length ? `${selectedUsers.length} selected` : "Search and select members"}<Search size={15} /></Button></PopoverTrigger><PopoverContent className="w-[min(26rem,calc(100vw-3rem))]"><Command><div className="relative pb-2"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><CommandInput className="pl-9" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Search members" aria-label="Search members" /></div><CommandList>{selectableUsers.map((person) => <CommandItem key={person.id} aria-selected={selectedUsers.includes(person.id)} onClick={() => setSelectedUsers((current) => current.includes(person.id) ? current.filter((id) => id !== person.id) : [...current, person.id])} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedUsers((current) => current.includes(person.id) ? current.filter((id) => id !== person.id) : [...current, person.id]); } }}><span aria-hidden="true" className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selectedUsers.includes(person.id) ? "border-[#ff2a2a] bg-[#ff2a2a]" : "border-white/25"}`}>{selectedUsers.includes(person.id) && <Check size={12} />}</span><span className="min-w-0"><span className="block text-sm text-white">{person.name}</span><span className="block truncate text-xs text-gray-500">{person.email}</span></span></CommandItem>)}{!selectableUsers.length && <CommandEmpty>No members found.</CommandEmpty>}</CommandList></Command></PopoverContent></Popover><DialogFooter><Button onClick={addMembers} disabled={!selectedUsers.length} isLoading={saving}>Add selected</Button></DialogFooter></DialogContent></Dialog>
  </main>;

  return <main className="groups-page mx-auto max-w-5xl space-y-6 text-gray-100">
    <header className="group-hero flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Community / Groups</p><h1 className="mt-2 text-3xl font-bold text-white">Groups</h1><p className="mt-2 text-sm text-gray-400">Join the groups that share your interests.</p></div>{admin && <Dialog open={createOpen} onOpenChange={setCreateOpen}><Button onClick={() => setCreateOpen(true)} icon={Plus}>New Group</Button><DialogContent><DialogHeader><DialogTitle>New group</DialogTitle><DialogDescription>Create a group for members to join.</DialogDescription></DialogHeader><form onSubmit={create} className="space-y-4"><Input required minLength={2} maxLength={80} placeholder="Group name" value={newGroup.name} onChange={(event) => setNewGroup((state) => ({ ...state, name: event.target.value }))} /><SelectField value={newGroup.type} onChange={(type) => setNewGroup((state) => ({ ...state, type }))} options={[{ value: "custom", label: "Custom" }, { value: "domain", label: "Domain" }, { value: "core", label: "Core" }]} aria-label="Group type" /><Textarea maxLength={500} placeholder="Description (optional)" value={newGroup.description} onChange={(event) => setNewGroup((state) => ({ ...state, description: event.target.value }))} /><label className="flex items-center gap-3 text-sm text-gray-300"><Checkbox checked={newGroup.acceptsRequests} onCheckedChange={(checked) => setNewGroup((state) => ({ ...state, acceptsRequests: checked }))} /> Allow join requests</label><DialogFooter><Button type="submit" isLoading={creating}>Create group</Button></DialogFooter></form></DialogContent></Dialog>}</header>
    {error && <Card role="alert" className="border-red-500/30 p-4 text-sm text-red-200">{error} <Button size="sm" variant="outline" className="ml-3" onClick={loadGroups}>Try again</Button></Card>}
    {loading ? <div className="groups-grid">{[1, 2, 3, 4].map((key) => <Skeleton key={key} className="h-36 w-full" />)}</div> : managerView ? <div className="groups-grid">{groups.filter((item) => admin || item.myRole === 'lead').map((item) => <GroupTile key={item._id} group={item}><Badge variant="outline">{item.type}</Badge><Badge>{item.pendingRequests || 0} requests</Badge><Link className="inline-flex items-center rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/10" to={`/dashboard/groups/${item._id}`}>Manage</Link><DropdownMenu><DropdownMenuTrigger aria-label={`Actions for ${item.name}`} className="rounded-lg p-2 text-gray-400 hover:bg-white/5"><MoreHorizontal size={17} /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link to={`/dashboard/groups/${item._id}?tab=settings`}>Edit settings</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-red-200" onSelect={() => archiveGroupRow(item)}>Archive group</DropdownMenuItem></DropdownMenuContent></DropdownMenu></GroupTile>)}{!groups.length && <Card className="p-10 text-center text-sm text-gray-400">No groups yet. Create a group to get started.</Card>}</div> : <Tabs defaultValue="mine"><TabsList><TabsTrigger value="mine">My groups</TabsTrigger><TabsTrigger value="browse">Browse groups</TabsTrigger></TabsList><TabsContent value="mine"><div className="groups-grid">{myGroups.map((item) => <GroupTile key={item._id} group={item}><Badge variant="outline">Joined</Badge>{item.type !== 'core' && <Button size="sm" variant="outline" onClick={() => leave(item)}>Leave</Button>}</GroupTile>)}{!myGroups.length && <Card className="group-empty p-10 text-center"><p className="text-sm text-gray-300">You’re not in any group yet.</p><Button className="mt-4" onClick={() => document.querySelector('[data-value="browse"]')?.click()}>Browse groups</Button></Card>}</div></TabsContent><TabsContent value="browse"><div className="groups-grid">{browsable.map((item) => <GroupTile key={item._id} group={item}>{item.myRole ? <Badge variant="outline">Joined</Badge> : item.myRequestStatus === 'pending' ? <><Badge>Pending</Badge>{item.pendingRequestId && <Button size="sm" variant="outline" onClick={() => cancelRequest(item.pendingRequestId)}>Cancel</Button>}</> : <Button size="sm" onClick={() => setRequestGroup(item)}>Request to join</Button>}</GroupTile>)}{!browsable.length && <Card className="group-empty p-10 text-center text-sm text-gray-400">No groups are accepting requests right now.</Card>}</div></TabsContent></Tabs>}
    <Dialog open={!!requestGroup} onOpenChange={(open) => !open && setRequestGroup(null)}><DialogContent><DialogHeader><DialogTitle>Request to join {requestGroup?.name}</DialogTitle><DialogDescription>Add an optional message for the group leads.</DialogDescription></DialogHeader><Textarea maxLength={500} value={requestMessage} onChange={(event) => setRequestMessage(event.target.value)} placeholder="Message (optional)" /><DialogFooter><Button onClick={join} isLoading={saving}>Send request</Button></DialogFooter></DialogContent></Dialog>
  </main>;
};
export default GroupsPage;
