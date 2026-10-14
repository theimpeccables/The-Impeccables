import React from 'react';
import { Clock } from 'lucide-react';
import { notify } from '../../utils/notify';

export const TaskCard = ({ task, onAcknowledge }) => {
  return (
    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className="text-red-300">{task.type}</span>
        <span className="text-gray-300 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {task.deadline}
        </span>
      </div>
      <div className="text-xs font-semibold text-white">{task.title}</div>
      <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
        <span className="text-gray-400">Status: {task.status}</span>
        <button
          type="button"
          onClick={() => onAcknowledge ? onAcknowledge(task.id) : notify({ type: 'info', title: 'Task status', message: 'This task cannot be updated from here.' })}
          className="text-red-300 hover:text-white underline cursor-pointer"
        >
          Acknowledge
        </button>
      </div>
    </div>
  );
};

export default TaskCard;
