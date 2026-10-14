import React from 'react';
import PropTypes from 'prop-types';
import { CheckCircle2, Clock, AlertCircle, XCircle, UploadCloud, FileText } from 'lucide-react';
import { cn } from '../../utils/cn';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', icon: FileText },
  submitted: { label: 'Submitted', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: UploadCloud },
  under_review: { label: 'Under Review', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: Clock },
  changes_requested: { label: 'Changes Requested', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: AlertCircle },
  approved: { label: 'Approved', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30', icon: XCircle },
  published: { label: 'Published', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', icon: CheckCircle2 },
};

export const StatusBadge = ({ status, showIcon = true, className }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border uppercase tracking-wider',
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
