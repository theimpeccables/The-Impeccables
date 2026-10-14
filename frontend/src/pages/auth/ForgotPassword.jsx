import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import api, { apiErrorMessage } from '../../services/api';
import { Input } from '../../components/ui/Primitives';
import { ArrowLeft, KeyRound, Link2, Mail, Send } from 'lucide-react';
import { ImpeccablesLogo } from '../../components/common/ImpeccablesLogo';

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
    <main className="auth-scene relative isolate flex min-h-[calc(100svh-5rem)] items-center overflow-hidden px-4 py-12 text-white sm:px-8">
      <div aria-hidden="true" className="auth-scene__texture" />
      <img aria-hidden="true" src="/assets/frames/frame_singer_lower.png" alt="" className="auth-scene__frame auth-scene__frame--left" />
      <div className="relative z-10 mx-auto grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[minmax(340px,440px)_minmax(260px,340px)] lg:justify-center">
        <Card className="auth-card p-6 shadow-2xl sm:p-8">
          <div className="mb-7 flex flex-col items-center text-center">
            <ImpeccablesLogo className="mb-3 h-12 w-14" />
            <p className="text-[10px] font-semibold uppercase tracking-[.2em]">The Impeccables</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[.2em] text-red-400">Portal</p>
            <h1 className="mt-5 text-2xl font-bold">Forgot Password?</h1>
            <p className="mt-2 max-w-xs text-sm leading-5 text-gray-400">No worries. Enter your registered email ID and we’ll send you a link to reset your password.</p>
          </div>
          {submitted ? (
            <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/[.07] p-4 text-sm leading-6 text-gray-200" role="status">
              If an active account matches that email, password reset instructions will be sent.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <label className="block text-xs font-medium text-gray-300" htmlFor="reset-email">Registered email ID</label>
              <div className="relative"><Mail aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><Input id="reset-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 pl-10" /></div>
              {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
              <Button type="submit" isLoading={isLoading} className="w-full">Send Reset Link <Send size={15} aria-hidden="true" /></Button>
            </form>
          )}
          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[.18em] text-gray-500"><span className="h-px flex-1 bg-white/10" />or<span className="h-px flex-1 bg-white/10" /></div>
          <Link to="/login" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 text-sm text-gray-200 transition-colors hover:border-red-500/40 hover:bg-red-500/[.06]"><ArrowLeft size={15} />Back to Login</Link>
        </Card>
        <aside className="auth-card hidden space-y-5 p-6 lg:block">
          <h2 className="text-sm font-semibold">Reset password steps</h2>
          <ol className="space-y-5">
            {[[Mail, 'Enter your email ID', 'Use your registered account email.'], [Link2, 'Receive reset link', 'Check your inbox for the password reset link.'], [KeyRound, 'Create a new password', 'Set a secure password and sign in.']].map(([Icon, title, detail], index) => <li key={title} className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.04] text-gray-200"><Icon size={17} /></span><span><b className="text-xs text-white">{index + 1}. {title}</b><span className="mt-1 block text-xs leading-5 text-gray-400">{detail}</span></span></li>)}
          </ol>
        </aside>
      </div>
    </main>
  );
};

export default ForgotPassword;
