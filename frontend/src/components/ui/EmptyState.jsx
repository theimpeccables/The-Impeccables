import { cn } from '../../utils/cn';

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'text-center py-20 rounded-2xl bg-white/[0.02] border border-white/5',
        className
      )}
    >
      {Icon && <Icon className="w-10 h-10 text-gray-400 mx-auto mb-4" />}
      <p className="text-base text-gray-400 mb-2">{title}</p>
      {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
      {action}
    </div>
  );
};

export default EmptyState;
