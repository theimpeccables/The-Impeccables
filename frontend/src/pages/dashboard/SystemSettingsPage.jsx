import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Camera, LockKeyhole, UserRound } from 'lucide-react';
import api, { apiErrorMessage, clearAccessToken } from '../../services/api';
import { logout } from '../../store/slices/authSlice';
import { notify } from '../../utils/notify';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Checkbox, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Primitives';
import PasswordInput from '../../components/ui/PasswordInput';

const PREFERENCES = [
  ['emailBirthday', 'Birthday updates'],
  ['emailTasks', 'Task updates'],
  ['emailApprovals', 'Submission updates'],
  ['emailAnnouncements', 'Announcements'],
  ['inAppAll', 'In-app notifications'],
];
const AUTOMATIONS = [
  ['automation.birthdays.enabled', 'Birthday notices', 'Send birthday notifications and email when configured.'],
  ['automation.eventReminders.enabled', 'Event reminders', 'Notify members about published events happening within 24 hours.'],
  ['automation.weeklyReports.enabled', 'Weekly reports', 'Generate and email the weekly club report.'],
];

const SystemSettingsPage = () => {
  const dispatch = useDispatch(); const navigate = useNavigate();
  const { role, user } = useSelector((state) => state.auth);
  const [preferences, setPreferences] = useState({});
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState({});

  useEffect(() => {
    let active = true;
    const requests = [api.get('/members/me')];
    if (role === 'super_admin') requests.push(api.get('/admin/settings'));
    Promise.all(requests).then(([profileResponse, settingsResponse]) => {
      if (!active) return;
      const loadedProfile = profileResponse.data.data.profile;
      setPreferences({ ...PREFERENCES.reduce((result, [key]) => ({ ...result, [key]: true }), {}), ...(loadedProfile?.notificationPreferences || {}) });
      if (settingsResponse) setSettings(Object.fromEntries(settingsResponse.data.data.map((setting) => [setting.key, setting.value])));
    }).catch((error) => notify({ type: 'error', title: 'Settings unavailable', message: apiErrorMessage(error, 'Unable to load your settings.') })).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [role]);

  const changePassword = async (event) => {
    event.preventDefault();
    const values = passwordForm;
    const validation = {};
    if (!values.currentPassword) validation.currentPassword = 'Enter your current password.';
    if (values.newPassword.length < 12) validation.newPassword = 'Use at least 12 characters.';
    if (values.confirmPassword !== values.newPassword) validation.confirmPassword = 'Passwords do not match.';
    setPasswordErrors(validation);
    if (Object.keys(validation).length) { notify({ type: 'error', title: 'Check the password fields', message: Object.values(validation)[0] }); return; }
    setPasswordSaving(true);
    try {
      await api.put('/auth/change-password', { currentPassword: values.currentPassword, newPassword: values.newPassword });
      clearAccessToken(); dispatch(logout()); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      notify({ type: 'success', title: 'Password updated', message: 'Sign in again using your new password.' });
      navigate('/login', { replace: true });
    } catch (error) { notify({ type: 'error', title: 'Password not changed', message: apiErrorMessage(error, 'Check your current password and try again.') }); }
    finally { setPasswordSaving(false); }
  };

  const requestReset = async () => {
    setResetLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: user?.email });
      notify({ type: 'success', title: 'Check your email', message: 'If the account can be reset, a secure link has been sent.' });
    } catch (error) { notify({ type: 'error', title: 'Reset link not sent', message: apiErrorMessage(error, 'Try again in a moment.') }); }
    finally { setResetLoading(false); }
  };

  const savePreferences = async () => {
    setSavingPreferences(true);
    try {
      await api.put('/members/me', { notificationPreferences: preferences });
      notify({ type: 'success', title: 'Preferences saved', message: 'Your notification choices have been updated.' });
    } catch (error) { notify({ type: 'error', title: 'Preferences not saved', message: apiErrorMessage(error) }); }
    finally { setSavingPreferences(false); }
  };

  const toggleAutomation = async (key, value, description) => {
    try {
      await api.patch(`/admin/settings/${key}`, { value, description });
      setSettings((current) => ({ ...current, [key]: value }));
      notify({ type: 'success', title: 'Setting saved', message: 'Your automation preference is updated.' });
    } catch (error) { notify({ type: 'error', title: 'Setting not saved', message: apiErrorMessage(error) }); }
  };

  if (loading) return <main className="settings-page mx-auto max-w-4xl space-y-5"><Skeleton className="h-12 w-56" /><Skeleton className="h-72 w-full" /></main>;
  return <main className="settings-page mx-auto max-w-4xl space-y-6 text-gray-100"><header className="settings-hero"><p className="eyebrow">Account</p><h1 className="mt-2 text-3xl font-bold text-white">Settings</h1><p className="mt-2 text-sm text-gray-400">Manage your profile, password, and notifications.</p></header>
    <Tabs defaultValue="profile"><TabsList><TabsTrigger value="profile"><UserRound size={15} className="mr-2" />Profile</TabsTrigger><TabsTrigger value="password"><LockKeyhole size={15} className="mr-2" />Password</TabsTrigger><TabsTrigger value="preferences"><Camera size={15} className="mr-2" />Preferences</TabsTrigger></TabsList>
      <TabsContent value="profile"><Card className="flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 className="font-semibold text-white">Your profile</h2><p className="mt-1 text-sm text-gray-400">{user?.name || 'Member'} · {user?.email}</p></div><Button onClick={() => navigate('/dashboard/profile')}>View profile</Button></Card></TabsContent>
      <TabsContent value="password"><Card className="space-y-5 p-5 sm:p-6"><div><h2 className="text-lg font-semibold text-white">Change password</h2><p className="mt-1 text-sm text-gray-400">Choose a new password with at least 12 characters.</p></div><form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-2">{[['currentPassword','Current password'],['newPassword','New password'],['confirmPassword','Confirm new password']].map(([field,label]) => <label key={field} className="text-xs text-gray-400">{label}<PasswordInput required autoComplete={field === 'currentPassword' ? 'current-password' : 'new-password'} value={passwordForm[field]} onChange={(event) => setPasswordForm((current) => ({ ...current, [field]: event.target.value }))} />{passwordErrors[field] && <span className="mt-1 block text-red-300">{passwordErrors[field]}</span>}</label>)}<div className="sm:col-span-2"><Button type="submit" isLoading={passwordSaving}>Change password</Button></div></form><div className="border-t border-white/10 pt-4"><p className="text-sm text-gray-400">Forgot your current password?</p><Button variant="outline" className="mt-2" onClick={requestReset} isLoading={resetLoading}>Email me a reset link</Button></div></Card></TabsContent>
      <TabsContent value="preferences"><Card className="space-y-4 p-5"><div><h2 className="font-semibold text-white">Notification preferences</h2><p className="mt-1 text-sm text-gray-400">Choose which updates you want to receive.</p></div>{PREFERENCES.map(([key,label]) => <label key={key} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-sm text-gray-200">{label}<Checkbox checked={preferences[key] !== false} onCheckedChange={(checked) => setPreferences((current) => ({ ...current, [key]: checked }))} aria-label={label} /></label>)}<Button onClick={savePreferences} isLoading={savingPreferences}>Save preferences</Button></Card>{role === 'super_admin' && <Card className="mt-4 space-y-3 p-5"><div><h2 className="font-semibold text-white">Scheduled notices</h2><p className="mt-1 text-sm text-gray-400">Optional system-wide reminders.</p></div>{AUTOMATIONS.map(([key,label,description]) => <label key={key} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[.03] px-4 py-3"><span><span className="block text-sm text-white">{label}</span><span className="mt-1 block text-xs text-gray-400">{description}</span></span><Checkbox checked={settings[key] !== false} onCheckedChange={(checked) => toggleAutomation(key, checked, description)} aria-label={label} /></label>)}</Card>}</TabsContent>
    </Tabs>
  </main>;
};

export default SystemSettingsPage;
