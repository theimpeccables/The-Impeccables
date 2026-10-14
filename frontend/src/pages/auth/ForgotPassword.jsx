import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import api, { apiErrorMessage } from '../../services/api';
import { Input } from '../../components/ui/Primitives';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] grid place-items-center px-4 py-16 text-white">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="mt-2 text-sm text-gray-400">Enter your account email and we’ll send a one-time reset link if the account is active.</p>
        {submitted ? (
          <p className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-gray-200" role="status">
            If an active account matches that email, password reset instructions will be sent.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-xs uppercase tracking-wide text-gray-400" htmlFor="reset-email">Email address</label>
            <Input id="reset-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 px-4" />
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <Button type="submit" isLoading={isLoading} className="w-full">Send reset link</Button>
          </form>
        )}
        <Link to="/login" className="mt-6 inline-block text-sm text-red-300 hover:text-red-200">Back to sign in</Link>
      </Card>
    </div>
  );
};

export default ForgotPassword;
