import React from 'react';
import { Card } from '../ui/Card';
import { cn } from '../../utils/cn';

export const MetricCard = ({
  label,
  value,
  subtext,
  icon: Icon,
  iconColor = 'text-purple-400',
  valueColor = 'text-white',
  className,
}) => {
  return (
    <Card className={cn('flex flex-col justify-between', className)} hoverEffect={false}>
      <div className="flex items-center justify-between text-gray-400 mb-2">
        <span className="text-xs font-mono uppercase">{label}</span>
        {Icon && <Icon className={cn('w-5 h-5', iconColor)} />}
      </div>
      <div className={cn('text-3xl font-black font-mono', valueColor)}>{value}</div>
      {subtext && <div className="text-xs text-gray-400 font-mono mt-1">{subtext}</div>}
    </Card>
  );
};

export default MetricCard;
