import React from 'react';
import { useSelector } from 'react-redux';
import { AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage, Skeleton } from './Primitives';
import { cn } from '../../utils/cn';

export const UserAvatar = ({ user, className, fallbackClassName, ...props }) => {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || user?.email || 'Member';
  const initials = name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  return <Avatar className={cn('h-9 w-9 border border-white/10 bg-white/[.05]', className)} {...props}>
    <AvatarImage src={user?.profilePhoto || user?.avatarUrl || user?.avatar || undefined} alt={name} />
    <AvatarFallback className={fallbackClassName}>{initials}</AvatarFallback>
  </Avatar>;
};

export const StatCard = ({ label, value, icon: Icon, helper, className }) => (
  <section className={cn('glass-card flex min-h-24 items-center gap-3 p-4', className)} aria-label={`${label}: ${value}`}>
    {Icon && <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-red-500/20 bg-red-500/[.08] text-red-300"><Icon size={18} aria-hidden="true" /></span>}
    <div className="min-w-0"><p className="text-xs text-gray-400">{label}</p><p className="mt-1 truncate text-2xl font-semibold leading-none text-white">{value}</p>{helper && <p className="mt-1 text-[11px] text-gray-500">{helper}</p>}</div>
  </section>
);

export const DataTable = ({ className, children, ...props }) => (
  <div className={cn('glass-card overflow-hidden', className)} {...props}>
    <div className="w-full overflow-x-auto"><table className="w-full text-sm">{children}</table></div>
  </div>
);

export const ErrorState = ({ title = 'Something went wrong', description, onRetry, className }) => (
  <div role="alert" className={cn('glass-card flex flex-col items-center px-5 py-12 text-center', className)}>
    <AlertCircle className="mb-3 h-8 w-8 text-red-400" aria-hidden="true" />
    <h2 className="text-sm font-semibold text-white">{title}</h2>
    {description && <p className="mt-1 max-w-md text-xs leading-5 text-gray-400">{description}</p>}
    {onRetry && <button type="button" onClick={onRetry} className="focus-red mt-4 rounded-lg border border-red-500/35 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-500/10">Try again</button>}
  </div>
);

export const LoadingCards = ({ count = 3, className }) => (
  <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-3', className)} aria-label="Loading" role="status">
    {Array.from({ length: count }, (_, index) => <div key={index} className="glass-card space-y-3 p-4"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-1/2" /></div>)}
  </div>
);

/** Presentation gate that mirrors ProtectedRoute's existing Redux role check. */
export const RoleGate = ({ roles: allowedRoles, children, fallback = null }) => {
  const auth = useSelector((state) => state.auth);
  if (!allowedRoles?.length) return children;
  const visible = allowedRoles.some((allowed) => auth.roles?.includes(allowed) || auth.role === allowed);
  return visible ? children : fallback;
};

