import DatePicker from 'react-datepicker';
import { motion, useReducedMotion } from 'framer-motion';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';

const AnimatedCalendarContainer = ({ className, children }) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: -5, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.16, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
};

const parseLocalDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toLocalDateTime = (date) => {
  if (!date) return '';
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const DateTimePicker = ({ value, onChange, className, placeholder = 'Select date and time', ...props }) => (
  <div className="impeccables-datepicker relative w-full">
    <CalendarDaysIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-red-300" />
    <DatePicker
      selected={parseLocalDate(value)}
      onChange={(date) => onChange(toLocalDateTime(date))}
      showTimeSelect
      timeIntervals={15}
      timeCaption="Time"
      dateFormat="MMM d, yyyy h:mm aa"
      placeholderText={placeholder}
      className={className}
      wrapperClassName="!block w-full"
      calendarContainer={AnimatedCalendarContainer}
      popperPlacement="bottom-start"
      showPopperArrow={false}
      {...props}
    />
  </div>
);

export default DateTimePicker;
