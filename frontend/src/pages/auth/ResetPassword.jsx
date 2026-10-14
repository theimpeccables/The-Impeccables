import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import api, { apiErrorMessage } from '../../services/api';
import PasswordInput from '../../components/ui/PasswordInput';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { ImpeccablesLogo } from '../../components/common/ImpeccablesLogo';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      navigate('/login', { replace: true, state: { message: 'Password updated. Sign in with your new password.' } });
    } catch (resetError) {
      setError(apiErrorMessage(resetError, 'This reset link is invalid or expired. Request another link.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-scene relative isolate flex min-h-[calc(100svh-5rem)] items-center justify-center overflow-hidden px-4 py-12 text-white">
      <div aria-hidden="true" className="auth-scene__texture" />
      <Card className="auth-card relative z-10 w-full max-w-md p-6 shadow-2xl sm:p-8">
        <div className="mb-7 flex flex-col items-center text-center"><ImpeccablesLogo className="mb-3 h-12 w-14" /><KeyRound className="mb-2 h-5 w-5 text-red-400" /><h1 className="text-2xl font-bold">Choose a new password</h1><p className="mt-2 text-sm text-gray-400">Set a new secure password for your account.</p></div>
        {!token ? (
          <p className="mt-4 text-sm text-red-300" role="alert">This password reset link is missing its token.</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-xs uppercase tracking-wide text-gray-400" htmlFor="new-password">New password</label>
<PasswordInput id="new-password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 px-4" />
            <label className="block text-xs uppercase tracking-wide text-gray-400" htmlFor="confirm-password">Confirm password</label>
<PasswordInput id="confirm-password" required minLength={12} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-12 px-4" />
            <p className="text-xs text-gray-400">Use at least 12 characters.</p>
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <Button type="submit" isLoading={isLoading} className="w-full">Update password</Button>
          </form>
        )}
        <Link to="/forgot-password" className="mt-6 inline-flex items-center gap-2 text-sm text-red-300 hover:text-red-200"><ArrowLeft size={14} />Request another reset link</Link>
      </Card>
    </main>
  );
};

export default ResetPassword;
