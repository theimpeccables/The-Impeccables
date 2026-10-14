import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import * as ScrollPrimitive from '@radix-ui/react-scroll-area';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

export const Input = React.forwardRef(({ className, ...props }, ref) => <input ref={ref} className={cn('flex h-10 w-full rounded-xl border border-white/12 bg-white/[.04] px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-[#ff2a2a]/40 disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />);
Input.displayName = 'Input';
export const Textarea = React.forwardRef(({ className, ...props }, ref) => <textarea ref={ref} className={cn('flex min-h-24 w-full rounded-xl border border-white/12 bg-white/[.04] px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-[#ff2a2a]/40 disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />);
Textarea.displayName = 'Textarea';
export const Form = ({ className, ...props }) => <form className={cn('space-y-4', className)} {...props} />;

export const Table = ({ className, ...props }) => <div className="relative w-full overflow-auto"><table className={cn('w-full caption-bottom text-sm', className)} {...props} /></div>;
export const TableHeader = ({ className, ...props }) => <thead className={cn('[&_tr]:border-b [&_tr]:border-white/10', className)} {...props} />;
export const TableBody = ({ className, ...props }) => <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
export const TableFooter = ({ className, ...props }) => <tfoot className={cn('border-t border-white/10 bg-white/[.03] font-medium', className)} {...props} />;
export const TableRow = ({ className, ...props }) => <tr className={cn('border-b border-white/[.07] transition-colors hover:bg-[#ff2a2a]/[.04]', className)} {...props} />;
export const TableHead = ({ className, ...props }) => <th className={cn('h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-gray-400', className)} {...props} />;
export const TableCell = ({ className, ...props }) => <td className={cn('p-4 align-middle text-gray-200', className)} {...props} />;

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => <DialogPrimitive.Overlay ref={ref} className={cn('fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out', className)} {...props} />);
export const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => <DialogPortal><DialogOverlay /><DialogPrimitive.Content ref={ref} className={cn('fixed left-1/2 top-1/2 z-[121] grid max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-2xl border border-white/12 bg-[#0d0d10]/95 p-6 text-white shadow-2xl shadow-black/70 backdrop-blur-xl focus:outline-none', className)} {...props}>{children}</DialogPrimitive.Content></DialogPortal>);
export const DialogTitle = React.forwardRef(({ className, ...props }, ref) => <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold text-white', className)} {...props} />);
export const DialogDescription = React.forwardRef(({ className, ...props }, ref) => <DialogPrimitive.Description ref={ref} className={cn('text-sm text-gray-400', className)} {...props} />);
export const DialogHeader = ({ className, ...props }) => <div className={cn('flex flex-col gap-1.5', className)} {...props} />;
export const DialogFooter = ({ className, ...props }) => <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />;

export const Sheet = DialogPrimitive.Root;
export const SheetContent = React.forwardRef(({ className, children, ...props }, ref) => <DialogPortal><DialogOverlay /><DialogPrimitive.Content ref={ref} className={cn('fixed inset-y-0 right-0 z-[121] h-full max-h-screen overflow-y-auto border-l border-white/12 bg-[#0d0d10]/98 p-6 text-white shadow-2xl shadow-black/70 backdrop-blur-xl focus:outline-none', className)} {...props}>{children}</DialogPrimitive.Content></DialogPortal>);
SheetContent.displayName = 'SheetContent';

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export const DropdownMenuGroup = DropdownPrimitive.Group;
export const DropdownMenuPortal = DropdownPrimitive.Portal;
export const DropdownMenuSub = DropdownPrimitive.Sub;
export const DropdownMenuRadioGroup = DropdownPrimitive.RadioGroup;
export const DropdownMenuContent = React.forwardRef(({ className, sideOffset = 6, ...props }, ref) => <DropdownPrimitive.Portal><DropdownPrimitive.Content ref={ref} sideOffset={sideOffset} className={cn('z-[130] min-w-40 overflow-hidden rounded-xl border border-white/12 bg-[#101013]/95 p-1 text-white shadow-xl shadow-black/60 backdrop-blur-xl', className)} {...props} /></DropdownPrimitive.Portal>);
export const DropdownMenuItem = React.forwardRef(({ className, inset, ...props }, ref) => <DropdownPrimitive.Item ref={ref} className={cn('flex cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors focus:bg-[#ff2a2a]/15 focus:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-40', inset && 'pl-8', className)} {...props} />);
export const DropdownMenuCheckboxItem = React.forwardRef(({ className, children, checked, ...props }, ref) => <DropdownPrimitive.CheckboxItem ref={ref} checked={checked} className={cn('relative flex cursor-default select-none items-center rounded-lg py-2 pl-8 pr-2.5 text-sm outline-none focus:bg-[#ff2a2a]/15 data-[disabled]:pointer-events-none data-[disabled]:opacity-40', className)} {...props}>{children}</DropdownPrimitive.CheckboxItem>);
export const DropdownMenuLabel = React.forwardRef(({ className, ...props }, ref) => <DropdownPrimitive.Label ref={ref} className={cn('px-2.5 py-1.5 text-xs font-semibold text-gray-400', className)} {...props} />);
export const DropdownMenuSeparator = React.forwardRef(({ className, ...props }, ref) => <DropdownPrimitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-white/10', className)} {...props} />);

export const ScrollArea = React.forwardRef(({ className, viewportProps, children, ...props }, ref) => <ScrollPrimitive.Root ref={ref} className={cn('relative overflow-hidden', className)} {...props}><ScrollPrimitive.Viewport className="h-full w-full rounded-[inherit]" {...viewportProps}>{children}</ScrollPrimitive.Viewport><ScrollPrimitive.Scrollbar orientation="vertical" className="flex w-2.5 touch-none select-none p-px transition-colors"><ScrollPrimitive.Thumb className="relative flex-1 rounded-full bg-white/20 hover:bg-[#ff2a2a]/60" /></ScrollPrimitive.Scrollbar><ScrollPrimitive.Corner /></ScrollPrimitive.Root>);

export const Avatar = AvatarPrimitive.Root;
export const AvatarImage = AvatarPrimitive.Image;
export const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => <AvatarPrimitive.Fallback ref={ref} className={cn('flex h-full w-full items-center justify-center rounded-full bg-white/[.08] text-sm font-semibold text-gray-300', className)} {...props} />);
export const Badge = ({ className, variant = 'default', ...props }) => <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium', variant === 'destructive' ? 'border-red-500/30 bg-red-500/15 text-red-200' : variant === 'outline' ? 'border-white/15 bg-transparent text-gray-300' : 'border-red-500/20 bg-red-500/10 text-red-200', className)} {...props} />;
export const Checkbox = React.forwardRef(({ className, ...props }, ref) => <CheckboxPrimitive.Root ref={ref} className={cn('peer flex h-4 w-4 shrink-0 items-center justify-center rounded border border-white/25 bg-white/[.04] text-white outline-none focus-visible:ring-2 focus-visible:ring-[#ff2a2a]/40 data-[state=checked]:border-[#ff2a2a] data-[state=checked]:bg-[#ff2a2a] disabled:cursor-not-allowed disabled:opacity-50', className)} {...props}><CheckboxPrimitive.Indicator><Check size={12} /></CheckboxPrimitive.Indicator></CheckboxPrimitive.Root>);
Checkbox.displayName = 'Checkbox';

export const Tabs = TabsPrimitive.Root;
export const TabsList = React.forwardRef(({ className, ...props }, ref) => <TabsPrimitive.List ref={ref} className={cn('inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[.03] p-1', className)} {...props} />);
export const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => <TabsPrimitive.Trigger ref={ref} className={cn('inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm text-gray-400 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#ff2a2a]/40 data-[state=active]:bg-[#ff2a2a]/15 data-[state=active]:text-white', className)} {...props} />);
export const TabsContent = React.forwardRef(({ className, ...props }, ref) => <TabsPrimitive.Content ref={ref} className={cn('mt-4 outline-none focus-visible:ring-2 focus-visible:ring-[#ff2a2a]/40', className)} {...props} />);

const ToggleGroupContext = React.createContext({ value: '', onValueChange: () => {}, disabled: false });
export const ToggleGroup = ({ value = '', onValueChange, disabled = false, className, children, ...props }) => <ToggleGroupContext.Provider value={{ value, onValueChange, disabled }}><div role="radiogroup" className={cn('inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[.03] p-1', className)} {...props}>{children}</div></ToggleGroupContext.Provider>;
export const ToggleGroupItem = ({ value, className, children, disabled = false, ...props }) => {
  const group = React.useContext(ToggleGroupContext);
  const active = group.value === value;
  return <button type="button" role="radio" aria-checked={active} data-state={active ? 'on' : 'off'} disabled={disabled || group.disabled} onClick={() => group.onValueChange?.(value)} className={cn('inline-flex min-h-9 items-center justify-center rounded-lg border border-transparent px-3 py-2 text-xs font-medium text-gray-400 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#ff2a2a]/40 disabled:pointer-events-none disabled:opacity-40 aria-checked:bg-[#ff2a2a]/15 aria-checked:text-white aria-checked:border-red-500/25', className)} {...props}>{children}</button>;
};

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipContent = React.forwardRef(({ className, sideOffset = 5, ...props }, ref) => <TooltipPrimitive.Portal><TooltipPrimitive.Content ref={ref} sideOffset={sideOffset} className={cn('z-[140] rounded-lg border border-white/10 bg-[#101013]/95 px-3 py-1.5 text-xs text-white shadow-xl backdrop-blur-xl', className)} {...props} /></TooltipPrimitive.Portal>);

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverContent = React.forwardRef(({ className, align = 'start', sideOffset = 5, ...props }, ref) => <PopoverPrimitive.Portal><PopoverPrimitive.Content ref={ref} align={align} sideOffset={sideOffset} className={cn('z-[135] rounded-xl border border-white/12 bg-[#101013]/95 p-2 text-white shadow-xl shadow-black/60 backdrop-blur-xl', className)} {...props} /></PopoverPrimitive.Portal>);
export const Command = ({ className, ...props }) => <div role="listbox" className={cn('overflow-hidden rounded-lg', className)} {...props} />;
export const CommandInput = React.forwardRef((props, ref) => <Input ref={ref} {...props} />);
CommandInput.displayName = 'CommandInput';
export const CommandList = ({ className, ...props }) => <div className={cn('max-h-56 overflow-y-auto', className)} {...props} />;
export const CommandItem = ({ className, ...props }) => <div role="option" tabIndex={0} className={cn('flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm outline-none hover:bg-[#ff2a2a]/[.08] focus-visible:ring-2 focus-visible:ring-[#ff2a2a]/40', className)} {...props} />;
export const CommandEmpty = ({ className, ...props }) => <p className={cn('px-2 py-4 text-center text-xs text-gray-500', className)} {...props} />;

export const Skeleton = ({ className, ...props }) => <div className={cn('animate-pulse rounded-lg bg-white/[.08]', className)} {...props} />;

export const Switch = ({ checked = false, onCheckedChange, disabled = false, className, ...props }) => <button type="button" role="switch" aria-checked={checked} data-state={checked ? 'checked' : 'unchecked'} disabled={disabled} onClick={() => onCheckedChange?.(!checked)} className={cn('relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-white/15 bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff2a2a]/40 data-[state=checked]:border-red-500/50 data-[state=checked]:bg-[#ff2a2a] disabled:cursor-not-allowed disabled:opacity-50', className)} {...props}><span className={cn('pointer-events-none block h-4 w-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-1')} /></button>;

export const Progress = ({ value = 0, className, indicatorClassName, ...props }) => <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, Math.min(100, value))} className={cn('h-1.5 w-full overflow-hidden rounded-full bg-white/10', className)} {...props}><div className={cn('h-full rounded-full bg-[#ff2a2a] transition-[width]', indicatorClassName)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;

export const SelectField = ({ value, onChange, options, placeholder, disabled, className, ...props }) => (
  <Select.Root value={value || undefined} onValueChange={onChange} disabled={disabled}>
    <Select.Trigger className={cn('inline-flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-white/12 bg-white/[.04] px-3 text-left text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[#ff2a2a]/40 disabled:opacity-50', className)} {...props}><Select.Value placeholder={placeholder} /><Select.Icon><ChevronDown size={15} className="text-gray-400" /></Select.Icon></Select.Trigger>
    <Select.Portal><Select.Content position="popper" className="z-[130] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-white/12 bg-[#101013]/95 text-white shadow-xl shadow-black/60 backdrop-blur-xl"><Select.Viewport className="p-1">{options.map((option) => <Select.Item key={option.value} value={option.value} disabled={option.disabled} className="relative flex cursor-default select-none items-center rounded-lg py-2 pl-8 pr-3 text-sm outline-none focus:bg-[#ff2a2a]/15 data-[disabled]:opacity-40"><span className="absolute left-2 flex h-4 w-4 items-center justify-center"><Select.ItemIndicator><Check size={14} className="text-red-300" /></Select.ItemIndicator></span><Select.ItemText>{option.label}</Select.ItemText></Select.Item>)}</Select.Viewport></Select.Content></Select.Portal>
  </Select.Root>
);

export const MultiSelectField = ({ options, selectedValues = [], onChange, placeholder = 'Choose options', className, ...props }) => {
  const [search, setSearch] = React.useState('');
  const selected = new Set(selectedValues);
  const label = options.filter((option) => selected.has(option.value)).map((option) => option.label);
  const filteredOptions = options.filter((option) => option.label.toLowerCase().includes(search.trim().toLowerCase()));
  const toggle = (value) => onChange(selected.has(value) ? selectedValues.filter((item) => item !== value) : [...selectedValues, value]);
  return <PopoverPrimitive.Root onOpenChange={(open) => !open && setSearch('')}><PopoverPrimitive.Trigger className={cn('inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border border-white/12 bg-white/[.04] px-3 py-2 text-left text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[#ff2a2a]/40', className)} {...props}><span className="truncate">{label.length ? `${label.length} selected: ${label.slice(0, 2).join(', ')}${label.length > 2 ? ` +${label.length - 2}` : ''}` : placeholder}</span><ChevronDown size={15} className="shrink-0 text-gray-400" /></PopoverPrimitive.Trigger><PopoverPrimitive.Portal><PopoverPrimitive.Content align="start" sideOffset={5} className="z-[130] w-64 rounded-xl border border-white/12 bg-[#101013]/95 p-2 text-white shadow-xl shadow-black/60 backdrop-blur-xl"><div className="pb-2"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search options" aria-label="Search options" /></div><ScrollArea className="h-48">{filteredOptions.map((option) => <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-200 hover:bg-[#ff2a2a]/[.08]"><CheckboxPrimitive.Root checked={selected.has(option.value)} onCheckedChange={() => toggle(option.value)} className="flex h-4 w-4 items-center justify-center rounded border border-white/25 data-[state=checked]:border-[#ff2a2a] data-[state=checked]:bg-[#ff2a2a]"><CheckboxPrimitive.Indicator><Check size={12} /></CheckboxPrimitive.Indicator></CheckboxPrimitive.Root>{option.label}</label>)}{filteredOptions.length === 0 && <p className="px-2 py-4 text-center text-xs text-gray-500">No matches.</p>}</ScrollArea></PopoverPrimitive.Content></PopoverPrimitive.Portal></PopoverPrimitive.Root>;
};
