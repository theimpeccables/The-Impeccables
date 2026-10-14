import React, { useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as Checkbox from '@radix-ui/react-checkbox';
import { Check, ChevronDown, Search, Users } from 'lucide-react';
import { cn } from '../../utils/cn';

export const MemberAssigneePicker = ({ members, selectedIds, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const sections = useMemo(() => {
    return members.filter((member) => `${member.name} ${member.email}`.toLowerCase().includes(search.trim().toLowerCase())).sort((left, right) => left.name.localeCompare(right.name));
  }, [members, search]);
  const toggle = (id) => onChange(selected.has(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id]);
  const names = members.filter((member) => selected.has(member.id)).map((member) => member.name);

  return <Popover.Root open={open} onOpenChange={setOpen}>
    <Popover.Trigger disabled={disabled} className={cn('flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#111116] px-3 py-2 text-left text-sm text-white outline-none transition-colors hover:border-white/20 focus-visible:border-red-500/60 focus-visible:ring-2 focus-visible:ring-red-500/20 disabled:opacity-50')}>
      <span className="flex min-w-0 items-center gap-2"><Users className="h-4 w-4 shrink-0 text-gray-400" /><span className="truncate">{names.length ? `${names.length} selected: ${names.slice(0, 2).join(', ')}${names.length > 2 ? ` +${names.length - 2}` : ''}` : 'Choose members'}</span></span>
      <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content align="start" sideOffset={6} className="z-[100] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/10 bg-[#111116] p-2 text-white shadow-2xl shadow-black/60">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search members" className="h-10 w-full rounded-lg border border-white/10 bg-black/30 pl-9 pr-3 text-sm outline-none placeholder:text-gray-500 focus:border-red-500/50" /></div>
        <div className="mt-2 max-h-64 overflow-y-auto pr-1">
          {!sections.length && <p className="px-3 py-6 text-center text-xs text-gray-500">No members match this search.</p>}
          {sections.map((member) => <label key={member.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-white/[.06]"><Checkbox.Root checked={selected.has(member.id)} onCheckedChange={() => toggle(member.id)} className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-white/25 bg-black/20 data-[state=checked]:border-red-500 data-[state=checked]:bg-red-600"><Checkbox.Indicator><Check className="h-3 w-3" /></Checkbox.Indicator></Checkbox.Root><span className="min-w-0"><span className="block truncate text-gray-100">{member.name}</span><span className="block truncate text-[10px] text-gray-500">{member.email}</span></span></label>)}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-white/10 px-1 pt-2"><span className="text-[11px] text-gray-500">{selectedIds.length} selected</span><button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500">Done</button></div>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
};
