import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { notify } from '../../utils/notify';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { usePublicData } from '../../hooks/usePublicData';
import api, { apiErrorMessage } from '../../services/api';
import { SelectField } from '../../components/ui/Primitives';
import {
  UploadCloud,
  Eye,
  ArrowLeft,
} from 'lucide-react';

export const SubmitPost = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const { data: domains } = usePublicData('/domains');
  const { data: events } = usePublicData('/events', { params: { upcoming: true, limit: 50 } });
  const [mediaFile, setMediaFile] = useState(null);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    domainId: user?.domainIds?.[0] || '',
    type: 'artwork',
    description: '',
    tags: 'Original, KIET, FineArt',
    associatedEvent: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Never carry a stale role-scope ID into the API request. Resolve it against
  // the currently active public domain list and fall back to an assigned one.
  const selectedDomainObj = domains.find((domain) => String(domain._id) === String(formData.domainId))
    || domains.find((domain) => user?.domainIds?.some((id) => String(id) === String(domain._id)))
    || domains[0]
    || { name: 'Choose a domain' };
  const selectedDomainId = selectedDomainObj._id || '';

  const previewUrl = useMemo(() => mediaFile ? URL.createObjectURL(mediaFile) : '', [mediaFile]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedDomain = domains.find((domain) => String(domain._id) === String(selectedDomainId));
    if (!selectedDomain) {
      setFormError('Choose a creative domain from the list before submitting.');
      return;
    }
    setIsSubmitting(true);
    setFormError('');
    try {
      const { data: created } = await api.post('/posts', {
        title: formData.title,
        domainId: selectedDomainId,
        contentType: formData.type,
        description: formData.description,
        articleContent: formData.type === 'article' ? formData.description : undefined,
        tags: formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        associatedEvent: formData.associatedEvent || undefined,
      });
      const post = created.data;
      if (mediaFile) {
        const upload = new FormData(); upload.append('media', mediaFile);
        await api.post(`/posts/${post._id}/media`, upload, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      await api.post(`/posts/${post._id}/submit`);
      setIsSubmitting(false);
      notify({
          type: 'success',
          title: 'Submitted to Domain Queue!',
          message: `Your creation has entered the ${selectedDomainObj.name} approval queue for reviewer feedback.`,
      });

      navigate('/dashboard');
    } catch (error) {
      setIsSubmitting(false);
      setFormError(apiErrorMessage(error, 'Your submission could not be sent. Your draft may have been saved; check My Submissions before retrying.'));
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto text-gray-100">
      
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-purple-400 hover:text-purple-300 mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </button>
        <h1 className="text-3xl font-extrabold text-white">
          Content Submission Studio
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Upload artwork, photographs, cinematics, or scripts for peer review and public publication.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Form (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="p-8 border-white/10 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Title */}
              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1.5">
                  Creation Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nocturnal Whispers: Neon Campus at 2 AM"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/70 text-sm"
                />
              </div>

              {/* Domain & Content Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-gray-400 mb-1.5">
                    Creative Domain *
                  </label>
                  <SelectField value={selectedDomainId} onChange={(value) => setFormData({ ...formData, domainId: value })} options={domains.map((domain) => ({ value: domain._id, label: domain.name }))} className="h-[46px]" />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-gray-400 mb-1.5">
                    Format *
                  </label>
                  <SelectField value={formData.type} onChange={(value) => setFormData({ ...formData, type: value })} className="h-[46px]" options={[{ value: 'artwork', label: 'Artwork / Illustration' }, { value: 'photography', label: 'Photography Frame' }, { value: 'video', label: 'Cinematic Reel / Video' }, { value: 'poster', label: 'Graphic Design / Poster' }, { value: 'article', label: 'Article / Script / Monologue' }]} />
                </div>
              </div>

              {/* Media URL / Upload */}
              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1.5">
                  Upload an image or video {formData.type !== 'article' && '*'}
                </label>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" required={formData.type !== 'article'} onChange={(event) => setMediaFile(event.target.files?.[0] || null)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200 file:mr-4 file:rounded-full file:border-0 file:bg-red-600 file:px-4 file:py-2 file:text-white" />
                <p className="mt-1 text-xs text-gray-500">Image or video, up to 100 MB. Stored securely in Cloudinary.</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1.5">
                  Concept & Description *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain the artistic intention, medium, color palette, or backstory behind this work..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/70 text-sm resize-none"
                />
              </div>

              {/* Tags & Event Association */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-gray-400 mb-1.5">
                    Tags (Comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="Charcoal, Neon, KIET"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/70 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-gray-400 mb-1.5">
                    Associate with Event (Optional)
                  </label>
                  <SelectField value={formData.associatedEvent || 'none'} onChange={(value) => setFormData({ ...formData, associatedEvent: value === 'none' ? '' : value })} options={[{ value: 'none', label: 'None / Standalone' }, ...events.map((event) => ({ value: event._id, label: event.title }))]} className="h-[46px]" />
                </div>
              </div>

              {/* Submit CTA */}
              {formError && <p className="text-sm text-red-300" role="alert">{formError}</p>}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Will enter: <strong className="text-purple-300">{selectedDomainObj.name} Queue</strong>
                </span>
                <Button
                  type="submit"
                  variant="glow"
                  size="md"
                  isLoading={isSubmitting}
                  icon={UploadCloud}
                >
                  Submit for Approval
                </Button>
              </div>

            </form>
          </Card>
        </div>

        {/* Live Preview (5 cols) */}
        <div className="lg:col-span-5 sticky top-28 space-y-4">
          <div className="text-xs font-mono uppercase tracking-widest text-purple-400 flex items-center gap-1.5">
            <Eye className="w-4 h-4" /> Live Card Preview (Once Published)
          </div>

          <div className="rounded-2xl overflow-hidden bg-[#0d0d16] border border-purple-500/30 shadow-2xl flex flex-col">
            <div className="relative aspect-[16/10] overflow-hidden bg-black/80">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <div className="absolute top-3 left-3">
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/20">
                  {selectedDomainObj.name}
                </span>
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="text-base font-bold text-white line-clamp-1">
                  {formData.title || 'Untitled Creation'}
                </h4>
                <p className="mt-2 text-xs text-gray-400 line-clamp-2 leading-relaxed">
                  {formData.description || 'Description will appear here...'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
                <span>By {user?.name || 'Aarav Patel'}</span>
                <span className="font-mono text-[11px]">Today</span>
              </div>
            </div>
          </div>

          <Card className="p-4 bg-purple-950/20 border-purple-500/20 text-xs text-gray-300">
            <div className="font-bold text-purple-300 mb-1">Approval Protocol Notice</div>
            Submissions are evaluated by designated domain leads for technical quality, authenticity, and college guidelines before publication.
          </Card>
        </div>

      </div>

    </div>
  );
};

export default SubmitPost;
