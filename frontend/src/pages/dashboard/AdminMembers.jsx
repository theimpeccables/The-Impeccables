import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Search, UserPlus, ShieldCheck, UserRoundX } from 'lucide-react';
import api, { apiErrorMessage } from '../../services/api';
import { notify } from '../../utils/notify';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { MultiSelectField } from '../../components/ui/Primitives';
import { Input } from '../../components/ui/Primitives';
import PasswordInput from '../../components/ui/PasswordInput';

const ROLE_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'domain_admin', label: 'Domain Admin' },
  { value: 'admin', label: 'Club Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

const initialMemberForm = { firstName: '', lastName: '', email: '', password: '' };

const AdminMembers = () => {
  const permissions = useSelector((state) => state.auth.permissions);
  const canManageRoles = permissions.includes('role:assign') && permissions.includes('role:revoke');
  const canCreateMembers = permissions.includes('user:create');
  const [members, setMembers] = useState([]);
  const [domains, setDomains] = useState([]);
  const [domainFilter, setDomainFilter] = useState('all');
  const [search, setSearch] = useState('');
  const membersRequest = useRef(null);
  const [roleChoice, setRoleChoice] = useState({});
  const [domainChoice, setDomainChoice] = useState({});
  const [form, setForm] = useState(initialMemberForm);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const loadMembers = useCallback(async (searchTerm = search) => {
    membersRequest.current?.abort();
    const controller = new AbortController();
    membersRequest.current = controller;
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.get('/members', { params: { limit: 100, search: searchTerm }, signal: controller.signal });
      setMembers(data.data);
    } catch (requestError) {
      if (requestError.name !== 'CanceledError') setError(apiErrorMessage(requestError, 'Unable to load member records.'));
    } finally {
      if (membersRequest.current === controller) setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    let active = true;
    api.get('/domains').then(({ data }) => { if (active) setDomains(data.data); })
      .catch((requestError) => { if (active) setError(apiErrorMessage(requestError, 'Unable to load domains.')); });
    return () => { active = false; };
  }, []);

  const visibleMembers = domainFilter === 'all' ? members : members.filter((member) => (member.domainIds || []).includes(domainFilter));

  useEffect(() => {
    const timer = window.setTimeout(() => loadMembers(), 300);
    return () => {
      window.clearTimeout(timer);
      membersRequest.current?.abort();
    };
  }, [loadMembers]);

  const updateStatus = async (member) => {
    try {
      await api.put(`/members/${member.id}/status`, { isActive: !member.isActive });
      notify({ type: 'success', title: member.isActive ? 'Member deactivated' : 'Member activated', message: `${member.name}'s account was updated.` });
      await loadMembers();
    } catch (requestError) {
      notify({ type: 'error', title: 'Could not update member', message: apiErrorMessage(requestError) });
    }
  };

  const changeRole = async (member) => {
    const role = roleChoice[member.id] || member.role || 'member';
    const payload = { role };
    if (role === 'domain_admin') payload.domainIds = domainChoice[member.id] || [];
    try {
      await api.post(`/roles/${member.id}/assign`, payload);
      notify({ type: 'success', title: 'Role assigned', message: `${role.replaceAll('_', ' ')} access was assigned.` });
      await loadMembers();
    } catch (requestError) {
      notify({ type: 'error', title: 'Could not assign role', message: apiErrorMessage(requestError) });
    }
  };

  const revokeRole = async (member) => {
    const role = roleChoice[member.id] || member.role || 'member';
    try {
      await api.delete(`/roles/${member.id}/revoke`, { data: { role } });
      notify({ type: 'success', title: 'Role revoked', message: `${role.replaceAll('_', ' ')} access was removed.` });
      await loadMembers();
    } catch (requestError) {
      notify({ type: 'error', title: 'Could not revoke role', message: apiErrorMessage(requestError) });
    }
  };

  const createMember = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      await api.post('/auth/register', form);
      setForm(initialMemberForm);
      setShowCreateForm(false);
      notify({ type: 'success', title: 'Member account created', message: 'The account can now sign in with the provided initial password.' });
      await loadMembers();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to create the member account.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-gray-100">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">Administration</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Member Management</h1>
          <p className="mt-2 text-sm text-gray-400">Manage member accounts and role assignments.</p>
        </div>
        {canCreateMembers && <Button onClick={() => setShowCreateForm((visible) => !visible)} icon={UserPlus}>{showCreateForm ? 'Close form' : 'Create member'}</Button>}
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

      {showCreateForm && canCreateMembers && (
        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Create member account</h2>
          <form onSubmit={createMember} className="grid gap-3 sm:grid-cols-2">
            {[
              ['firstName', 'First name', 'text'],
              ['lastName', 'Last name', 'text'],
              ['email', 'Email address', 'email'],
              ['password', 'Initial password (12+ characters)', 'password'],
            ].map(([field, label, type]) => (
              <label key={field} className="text-xs text-gray-400">
                {label}
                {field === 'password' ? <PasswordInput required minLength={12} maxLength={128} autoComplete="new-password" value={form[field]} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} className="mt-1.5" /> : <Input type={type} required maxLength={field === 'email' ? 254 : 60} autoComplete={field === 'email' ? 'email' : 'off'} value={form[field]} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} className="mt-1.5" />}
              </label>
            ))}
            <div className="sm:col-span-2"><Button type="submit" isLoading={isSaving}>Create account</Button></div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
          <div className="flex items-center gap-3"><h2 className="font-semibold text-white">Members</h2><Select value={domainFilter} onValueChange={setDomainFilter}><SelectTrigger className="h-9 w-44 text-xs"><SelectValue placeholder="All domains" /></SelectTrigger><SelectContent><SelectItem value="all">All domains</SelectItem>{domains.map((domain) => <SelectItem key={domain._id} value={domain._id}>{domain.name}</SelectItem>)}</SelectContent></Select></div>
          <label className="relative w-full sm:w-72">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-red-500/60" />
          </label>
        </div>
        {isLoading ? <p className="p-8 text-center text-sm text-gray-400" role="status">Loading member records…</p> : visibleMembers.length === 0 ? <p className="p-8 text-center text-sm text-gray-400">No members found.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-gray-500">
                <tr><th className="px-4 py-3">Member</th><th className="px-4 py-3">Role(s)</th><th className="px-4 py-3">Account</th><th className="px-4 py-3">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-white/[0.07]">
                {visibleMembers.map((member) => {
                  const selectedRole = roleChoice[member.id] || member.role || 'member';
                  return (
                    <tr key={member.id} className="align-top">
                      <td className="px-4 py-4">
                        <div className="font-medium text-white">{member.name}</div>
                        <div className="mt-1 text-xs text-gray-400">{member.email}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1.5">{(member.roles || ['member']).map((role) => <span key={role} className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] capitalize text-red-200">{role.replaceAll('_', ' ')}</span>)}</div>
                        {canManageRoles && <div className="mt-3 flex items-center gap-2">
                          <Select value={selectedRole} onValueChange={(value) => setRoleChoice((current) => ({ ...current, [member.id]: value }))}><SelectTrigger className="h-8 w-40 text-xs" aria-label={`Select role for ${member.name}`}><SelectValue /></SelectTrigger><SelectContent>{ROLE_OPTIONS.map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}</SelectContent></Select>
                        </div>}
                        {canManageRoles && selectedRole === 'domain_admin' && <div className="mt-2"><MultiSelectField aria-label={`Domains assigned to ${member.name}`} placeholder="Choose domains" options={domains.map((domain) => ({ value: domain._id, label: domain.name }))} selectedValues={domainChoice[member.id] || member.domainIds || []} onChange={(values) => setDomainChoice((current) => ({ ...current, [member.id]: values }))} /></div>}
                      </td>
                      <td className="px-4 py-4"><span className={member.isActive ? 'text-emerald-300' : 'text-gray-500'}>{member.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {canManageRoles && <>
                            <Button size="sm" variant="outline" icon={ShieldCheck} onClick={() => changeRole(member)}>Assign</Button>
                            <Button size="sm" variant="secondary" icon={UserRoundX} onClick={() => revokeRole(member)}>Revoke</Button>
                          </>}
                          {permissions.includes('member:manage') && <Button size="sm" variant="ghost" onClick={() => updateStatus(member)}>{member.isActive ? 'Deactivate' : 'Reactivate'}</Button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-xs text-gray-500">New accounts receive the Member role. Role changes require Super Admin permission and are enforced by the API.</p>
    </div>
  );
};

export default AdminMembers;
