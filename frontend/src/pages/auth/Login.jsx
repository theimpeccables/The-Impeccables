import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Lock, Mail } from 'lucide-react';
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
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-16 text-gray-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center">
          <ImpeccablesLogo className="w-16 h-14 mb-4" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">The Impeccables Portal</h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-400">Authorized Member &amp; Leadership Access</p>
        </div>

        <Card className="p-8 border-white/10 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs uppercase text-gray-400 mb-1.5">Official Email</label>
              <div className="relative">
                <Mail aria-hidden="true" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <PasswordInput
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  required
                  maxLength={254}
                  placeholder="member@theimpeccables.org"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-10 pr-4 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs uppercase text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock aria-hidden="true" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <Input
                  id="login-password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pl-10 py-2.5 text-sm"
                />
              </div>
            </div>

            {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">{error}</p>}

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-red-300 hover:text-red-200">Forgot password?</Link>
            </div>

            <Button type="submit" variant="glow" size="md" isLoading={isLoading} className="w-full mt-2">
              Sign In to Dashboard
            </Button>
          </form>
        </Card>

        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-gray-400 hover:text-white">← Return to Public Homepage</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
