import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export const MeetingCard = ({ meeting }) => {
  return (
    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">
            {meeting.type}
          </span>
          <span className="text-xs font-mono text-gray-500">{meeting.date}</span>
        </div>
        <div className="text-sm font-semibold text-white">{meeting.title}</div>
        <div className="text-xs text-gray-400 mt-0.5">{meeting.venue}</div>
      </div>

      <div className="shrink-0">
        {meeting.status === 'present' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Present
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> {meeting.excused ? 'Excused' : 'Absent'}
          </span>
        )}
      </div>
    </div>
  );
};

export default MeetingCard;
