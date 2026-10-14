import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import api, { apiErrorMessage } from '../../services/api';
import PasswordInput from '../../components/ui/PasswordInput';

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
    <div className="min-h-[75vh] grid place-items-center px-4 py-16 text-white">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold">Choose a new password</h1>
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
        <Link to="/forgot-password" className="mt-6 inline-block text-sm text-red-300 hover:text-red-200">Request another reset link</Link>
      </Card>
    </div>
  );
};

export default ResetPassword;
