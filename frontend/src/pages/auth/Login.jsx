import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { setCredentials } from '../../store/slices/authSlice';
import { notify } from '../../utils/notify';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Primitives';
import PasswordInput from '../../components/ui/PasswordInput';
import { ImpeccablesLogo } from '../../components/common/ImpeccablesLogo';
import api, { apiErrorMessage, setAccessToken } from '../../services/api';

export const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAccessToken(data.data.accessToken);
      dispatch(setCredentials(data.data));
      notify({ type: 'success', title: 'Welcome back', message: `Signed in as ${data.data.user.name}.` });
      navigate('/dashboard', { replace: true });
    } catch (loginError) {
      setError(apiErrorMessage(loginError, 'Unable to sign in. Check your details and try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-scene relative isolate flex min-h-[calc(100svh-5rem)] items-center overflow-hidden px-4 py-12 text-gray-100 sm:px-8">
      <div aria-hidden="true" className="auth-scene__texture" />
      <img aria-hidden="true" src="/assets/frames/frame_performer_left.png" alt="" className="auth-scene__frame auth-scene__frame--left" />
      <img aria-hidden="true" src="/assets/frames/frame_camera.png" alt="" className="auth-scene__frame auth-scene__frame--right" />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
        <section className="hidden lg:block">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[.42em] text-white/80">Create · Collaborate · Celebrate</p>
          <p className="text-[11px] uppercase tracking-[.34em] text-gray-300">A community beyond creative boundaries</p>
          <div className="mt-10 flex items-center gap-4 text-xs uppercase tracking-[.25em] text-white/75"><span className="h-px w-16 bg-red-500/70" />The Impeccables</div>
        </section>

        <div className="mx-auto w-full max-w-md">
          <Card className="auth-card p-6 shadow-2xl sm:p-8">
            <div className="mb-7 flex flex-col items-center text-center">
              <ImpeccablesLogo className="mb-3 h-12 w-14" />
              <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-white">The Impeccables</p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[.2em] text-red-400">Portal</p>
              <h1 className="mt-5 text-2xl font-bold tracking-tight text-white">Welcome back</h1>
              <p className="mt-2 max-w-xs text-sm leading-5 text-gray-400">Log in to access your dashboard and continue building, creating and collaborating.</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-xs font-medium text-gray-300">Email ID</label>
                <div className="relative">
                  <Mail aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input id="login-email" type="email" autoComplete="username" required maxLength={254} placeholder="member@theimpeccables.org" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 pl-10 pr-4 text-sm" />
                </div>
              </div>
              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-xs font-medium text-gray-300">Password</label>
                <div className="relative">
                  <Lock aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <PasswordInput id="login-password" autoComplete="current-password" required maxLength={128} placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 pl-10 text-sm" />
                </div>
              </div>
              {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">{error}</p>}
              <div className="flex justify-end"><Link to="/forgot-password" className="text-xs font-medium text-red-300 transition-colors hover:text-red-200">Forgot password?</Link></div>
              <Button type="submit" variant="glow" size="md" isLoading={isLoading} className="mt-2 w-full">Log In <ArrowRight size={16} aria-hidden="true" /></Button>
            </form>
            <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[.18em] text-gray-500"><span className="h-px flex-1 bg-white/10" />or<span className="h-px flex-1 bg-white/10" /></div>
            <div className="rounded-xl border border-white/10 bg-white/[.025] px-4 py-3 text-center text-xs text-gray-400">Need access? <span className="text-red-300">Contact your administrator.</span></div>
          </Card>
          <div className="mt-5 text-center"><Link to="/" className="text-xs text-gray-400 transition-colors hover:text-white">← Back to Website</Link></div>
        </div>
      </div>
    </main>
  );
};

export default Login;
