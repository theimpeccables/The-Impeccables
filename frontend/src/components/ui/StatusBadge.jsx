import React from 'react';
import PropTypes from 'prop-types';
import { CheckCircle2, Clock, AlertCircle, XCircle, UploadCloud, FileText } from 'lucide-react';
import { cn } from '../../utils/cn';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-white/[.05] text-gray-300 border-white/10', icon: FileText },
  submitted: { label: 'Submitted', color: 'bg-white/[.06] text-gray-200 border-white/15', icon: UploadCloud },
  under_review: { label: 'Under Review', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: Clock },
  changes_requested: { label: 'Changes Requested', color: 'bg-red-500/15 text-red-200 border-red-500/30', icon: AlertCircle },
  approved: { label: 'Approved', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-500/15 text-red-200 border-red-500/30', icon: XCircle },
  published: { label: 'Published', color: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/25', icon: CheckCircle2 },
};

export const StatusBadge = ({ status, showIcon = true, className }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide',
        config.color,
        className
      )}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      <span>{config.label}</span>
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
  showIcon: PropTypes.bool,
  className: PropTypes.string,
};

export default StatusBadge;
