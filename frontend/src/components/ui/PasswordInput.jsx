import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from './Primitives';

const PasswordInput = React.forwardRef(({ className = '', ...props }, ref) => {
  const [visible, setVisible] = useState(false);
  return <span className="relative block">
    <Input ref={ref} type={visible ? 'text' : 'password'} className={`pr-12 ${className}`} {...props} />
    <button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? 'Hide password' : 'Show password'} className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 outline-none transition-colors hover:text-[#ff2a2a] focus-visible:ring-2 focus-visible:ring-[#ff2a2a]/50">{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
  </span>;
});
PasswordInput.displayName = 'PasswordInput';
export default PasswordInput;
