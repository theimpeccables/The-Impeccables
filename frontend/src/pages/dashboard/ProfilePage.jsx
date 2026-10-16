import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Camera, Trash2, UserRound } from 'lucide-react';
import api, { apiErrorMessage } from '../../services/api';
import { setCredentials } from '../../store/slices/authSlice';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Skeleton, Switch, Textarea } from '../../components/ui/Primitives';
import { notify } from '../../utils/notify';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const dateInputValue = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';
const emptyForm = { firstName: '', lastName: '', phone: '', year: '', branch: '', bio: '', dateOfBirth: '', birthdayEmailOptOut: false, showBirthdayToClub: true };

const ProfilePage = ({ embedded = false }) => {
  const dispatch = useDispatch();
  const { user, token, role } = useSelector((state) => state.auth);
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api.get('/members/me').then(({ data }) => {
      if (!active) return;
      const result = data.data;
      setProfile(result.profile);
      setForm({ firstName: result.user.firstName || '', lastName: result.user.lastName || '', phone: result.user.phone || '', year: result.profile?.year ? String(result.profile.year) : '', branch: result.profile?.branch || '', bio: result.profile?.bio || '', dateOfBirth: dateInputValue(result.user.dateOfBirth), birthdayEmailOptOut: Boolean(result.user.birthdayEmailOptOut), showBirthdayToClub: result.user.showBirthdayToClub !== false });
      dispatch(setCredentials({ user: result.user, accessToken: token }));
    }).catch((error) => {
      if (active) notify({ type: 'error', title: 'Profile unavailable', message: apiErrorMessage(error, 'Unable to load your profile.') });
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [dispatch, token]);

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  const choosePhoto = (file) => {
    if (!file) return;
    if (!ACCEPTED_PHOTO_TYPES.has(file.type)) {
      notify({ type: 'error', title: 'Unsupported photo', message: 'Choose a JPG, PNG, or WebP image.' });
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      notify({ type: 'error', title: 'Photo is too large', message: 'Choose an image smaller than 2 MB.' });
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const updateUser = (nextUser) => dispatch(setCredentials({ user: nextUser, accessToken: token }));

  const refreshProfile = async () => {
    const { data } = await api.get('/members/me');
    const result = data.data;
    setProfile(result.profile);
    setForm({ firstName: result.user.firstName || '', lastName: result.user.lastName || '', phone: result.user.phone || '', year: result.profile?.year ? String(result.profile.year) : '', branch: result.profile?.branch || '', bio: result.profile?.bio || '', dateOfBirth: dateInputValue(result.user.dateOfBirth), birthdayEmailOptOut: Boolean(result.user.birthdayEmailOptOut), showBirthdayToClub: result.user.showBirthdayToClub !== false });
    updateUser(result.user);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = Object.fromEntries(Object.entries({ firstName: form.firstName, lastName: form.lastName, phone: form.phone, year: form.year ? Number(form.year) : undefined, branch: form.branch, bio: form.bio, dateOfBirth: form.dateOfBirth || null, birthdayEmailOptOut: form.birthdayEmailOptOut, showBirthdayToClub: form.showBirthdayToClub }).filter(([, value]) => value !== undefined && value !== ''));
      await api.put('/members/me', payload);
      await refreshProfile();
      notify({ type: 'success', title: 'Changes saved', message: 'Your profile has been updated.' });
    } catch (error) {
      notify({ type: 'error', title: 'Could not save profile', message: apiErrorMessage(error, 'Please check your details and try again.') });
    } finally { setSaving(false); }
  };

  const uploadPhoto = async () => {
    if (!photoFile) return;
    setSaving(true);
    try {
      const body = new FormData();
      body.append('photo', photoFile);
      await api.post('/members/me/photo', body);
      await refreshProfile();
      setPhotoFile(null);
      setPhotoPreview('');
      notify({ type: 'success', title: 'Photo updated', message: 'Your new photo is now shown on your profile.' });
    } catch (error) {
      console.error('Profile photo upload failed:', error);
      notify({ type: 'error', title: 'Photo upload failed', message: apiErrorMessage(error, 'Please try another image.') });
    } finally { setSaving(false); }
  };

  const removePhoto = async () => {
    setSaving(true);
    try {
      await api.delete('/members/me/photo');
      await refreshProfile();
      setPhotoFile(null);
      setPhotoPreview('');
      notify({ type: 'success', title: 'Photo removed', message: 'Your profile photo has been removed.' });
    } catch (error) {
      console.error('Profile photo removal failed:', error);
      notify({ type: 'error', title: 'Could not remove photo', message: apiErrorMessage(error) });
    } finally { setSaving(false); }
  };

  if (loading) return <div className={`${embedded ? '' : 'profile-page mx-auto max-w-4xl'} space-y-6`}><Skeleton className="h-12 w-56" /><Skeleton className="h-36 w-full" /><Skeleton className="h-80 w-full" /></div>;

  const displayedPhoto = photoPreview || user?.profilePhoto || user?.avatar;
  const domainNames = profile?.domains?.map((domain) => domain.name).filter(Boolean).join(', ') || 'Not assigned';
  return <div className={`${embedded ? 'space-y-4' : 'profile-page mx-auto max-w-4xl space-y-6'} text-gray-100`}>
    {embedded ? <h2 className="text-lg font-semibold text-white">Profile information</h2> : <header className="profile-hero"><p className="eyebrow">Your account</p><h1 className="mt-2 text-3xl font-bold text-white">Profile</h1><p className="mt-2 text-sm text-gray-400">Keep your contact and member details up to date.</p></header>}
    <Card className="profile-photo-card flex flex-wrap items-center gap-5 p-5">
      <label className="group relative block h-24 w-24 cursor-pointer rounded-full focus-within:ring-2 focus-within:ring-[#ff2a2a]/50" title="Choose profile photo">
        {displayedPhoto ? <img src={displayedPhoto} alt="Profile preview" className="h-24 w-24 rounded-full border border-white/15 object-cover" /> : <span className="flex h-24 w-24 items-center justify-center rounded-full border border-white/15 bg-white/[.04] text-gray-400"><UserRound size={30} /></span>}
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100"><Camera size={19} /></span>
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { choosePhoto(event.target.files?.[0]); event.target.value = ''; }} />
      </label>
      <div className="min-w-[200px] flex-1"><h2 className="font-semibold text-white">Profile photo</h2><p className="mt-1 text-sm text-gray-400">JPG, PNG, or WebP. Maximum 2 MB. The circular preview shows how it will appear.</p><div className="mt-3 flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-gray-200 hover:bg-white/5"><Camera size={14} /> Upload photo<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { choosePhoto(event.target.files?.[0]); event.target.value = ''; }} /></label>{photoFile && <Button size="sm" onClick={uploadPhoto} isLoading={saving}>Save photo</Button>}{user?.profilePhoto && <Button size="sm" variant="outline" icon={Trash2} onClick={removePhoto} isLoading={saving}>Remove photo</Button>}</div></div>
    </Card>
    <Card className="profile-form-card p-5 sm:p-7"><form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
      <label className="text-xs text-gray-400">First name<Input required minLength={2} maxLength={60} value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} /></label>
      <label className="text-xs text-gray-400">Last name<Input required minLength={2} maxLength={60} value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} /></label>
      <label className="text-xs text-gray-400">Email<Input disabled value={user?.email || ''} /></label>
      <label className="text-xs text-gray-400">Phone<Input type="tel" maxLength={32} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
      <label className="text-xs text-gray-400">Role<Input disabled value={(role || 'member').replaceAll('_', ' ')} /></label>
      <label className="text-xs text-gray-400">Domain<Input disabled value={domainNames} /></label>
      <label className="text-xs text-gray-400">Year of study<Input type="number" min="1" max="8" value={form.year} onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))} /></label>
      <label className="text-xs text-gray-400">Branch<Input maxLength={100} value={form.branch} onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value }))} /></label>
      <label className="text-xs text-gray-400">Date of birth<Input type="date" value={form.dateOfBirth} onChange={(event) => setForm((current) => ({ ...current, dateOfBirth: event.target.value }))} /></label>
      <div className="flex flex-col justify-center gap-3 rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 sm:col-span-2 sm:flex-row sm:justify-between">
        <label className="flex items-center justify-between gap-4 text-sm text-gray-300">Don’t send me birthday emails<Switch checked={form.birthdayEmailOptOut} onCheckedChange={(checked) => setForm((current) => ({ ...current, birthdayEmailOptOut: checked }))} aria-label="Don't send me birthday emails" /></label>
        <label className="flex items-center justify-between gap-4 text-sm text-gray-300">Show my birthday to the club<Switch checked={form.showBirthdayToClub} onCheckedChange={(checked) => setForm((current) => ({ ...current, showBirthdayToClub: checked }))} aria-label="Show my birthday to the club" /></label>
      </div>
      <label className="text-xs text-gray-400 sm:col-span-2">Short bio<Textarea maxLength={1000} rows={4} value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} /></label>
      <div className="sm:col-span-2"><Button type="submit" isLoading={saving}>Save changes</Button></div>
    </form></Card>
  </div>;
};
export default ProfilePage;
