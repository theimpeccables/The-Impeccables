import { toast } from 'sonner';

export const notify = ({ type = 'info', title, message, duration = 4000 }) => {
  const show = toast[type] || toast;
  return show(title || message || 'Notification', {
    description: title ? message : undefined,
    duration,
  });
};
