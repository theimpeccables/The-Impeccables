import React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../utils/cn';

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger ref={ref} className={cn('inline-flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#111116] px-3 text-sm text-white outline-none transition-colors focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20 disabled:pointer-events-none disabled:opacity-50 data-[placeholder]:text-gray-500', className)} {...props}>
    {children}<SelectPrimitive.Icon asChild><ChevronDown className="h-4 w-4 shrink-0 text-gray-400" /></SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = 'SelectTrigger';

export const SelectContent = React.forwardRef(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content ref={ref} position={position} className={cn('z-[100] max-h-72 min-w-[8rem] overflow-hidden rounded-xl border border-white/10 bg-[#111116] text-white shadow-2xl shadow-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out', className)} {...props}>
      <SelectPrimitive.ScrollUpButton className="flex h-7 items-center justify-center text-gray-400"><ChevronUp className="h-4 w-4" /></SelectPrimitive.ScrollUpButton>
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      <SelectPrimitive.ScrollDownButton className="flex h-7 items-center justify-center text-gray-400"><ChevronDown className="h-4 w-4" /></SelectPrimitive.ScrollDownButton>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = 'SelectContent';

export const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item ref={ref} className={cn('relative flex w-full cursor-default select-none items-center rounded-lg py-2 pl-8 pr-3 text-sm outline-none focus:bg-red-500/15 focus:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50', className)} {...props}>
    <span className="absolute left-2 flex h-4 w-4 items-center justify-center"><SelectPrimitive.ItemIndicator><Check className="h-4 w-4 text-red-300" /></SelectPrimitive.ItemIndicator></span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = 'SelectItem';
