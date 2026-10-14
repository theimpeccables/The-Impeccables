import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { notify } from '../../utils/notify';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusPill } from '../../components/ui/Badge';
import { usePublicData } from '../../hooks/usePublicData';
import api, { apiErrorMessage } from '../../services/api';
import confetti from 'canvas-confetti';
import {
  CheckSquare,
  Check,
  X,
  AlertCircle,
  Eye,
  Globe,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { SelectField } from '../../components/ui/Primitives';

export const DomainAdminQueue = () => {
  const { role, assignedDomain } = useSelector((state) => state.auth);
  const { data: domains } = usePublicData('/domains');
  const [submissions, setSubmissions] = useState([]);
  const [queueError, setQueueError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedDomainFilter, setSelectedDomainFilter] = useState(
    role === 'domain_admin' && assignedDomain ? assignedDomain : 'all'
  );
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [reviewModalSub, setReviewModalSub] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/approvals', { params: { status: selectedStatusFilter === 'under_review' ? 'pending' : selectedStatusFilter } })
      .then(({ data }) => { if (active) { setSubmissions(data.data.map((approval) => ({ ...approval.postId, id: approval._id, approvalId: approval._id, postId: approval.postId?._id, domainId: approval.domain?._id, domainName: approval.domain?.name || '', author: `${approval.submittedBy?.firstName || ''} ${approval.submittedBy?.lastName || ''}`.trim(), type: approval.postId?.contentType, date: new Date(approval.submittedAt).toLocaleString(), status: approval.status === 'pending' ? 'under_review' : approval.status, mediaUrl: approval.media?.[0]?.url || '', thumbnail: approval.media?.[0]?.thumbnailUrl || approval.media?.[0]?.url || '', description: approval.postId?.description || '' }))); setQueueError(''); } })
      .catch((error) => { if (active) setQueueError(apiErrorMessage(error, 'Unable to load the approval queue.')); });
    return () => { active = false; };
  }, [selectedStatusFilter, refreshKey]);

  // Filter queue
  const queueItems = submissions.filter((item) => {
    const matchesDomain =
      selectedDomainFilter === 'all' ||
      item.domainId === selectedDomainFilter;

    const matchesStatus =
      selectedStatusFilter === 'all' ||
      item.status === selectedStatusFilter;

    return matchesDomain && matchesStatus;
  });

  const handleDecision = async (sub, decision) => {
    if (decision !== 'approved' && !reviewNote.trim()) { setReviewError('Add a short note before requesting changes or rejecting.'); return; }
    setReviewError('');
    try {
      await api.post(`/approvals/${sub.approvalId}/decision`, { decision, comments: reviewNote });
      notify({ type: decision === 'rejected' ? 'error' : 'success', title: decision === 'approved' ? 'Review recorded' : decision === 'rejected' ? 'Submission rejected' : 'Changes requested', message: `Your decision for “${sub.title}” was saved.` });
      setReviewModalSub(null); setReviewNote(''); setRefreshKey((key) => key + 1);
    } catch (error) { setReviewError(apiErrorMessage(error, 'Could not save your review.')); }
  };

  const handlePublish = async (sub) => {
    try {
      await api.post(`/posts/${sub.postId}/publish`);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
      notify({
        type: 'success',
        title: 'Published to Public Website! 🎉',
        message: `"${sub.title}" is now visible to all public visitors in the Gallery & Domain page.`,
      });
    setReviewModalSub(null);
    setReviewNote('');
    setRefreshKey((key) => key + 1);
    } catch (error) { setQueueError(apiErrorMessage(error, 'Could not publish this work.')); }
  };

  return (
    <div className="approvals-page space-y-8 text-gray-100">
      
      {/* Header */}
      <div className="approvals-hero flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-widest text-red-300 bg-red-950/60 border border-red-500/30 mb-2">
            <CheckSquare className="w-3.5 h-3.5 text-red-400" />
            <span>Domain Quality Assurance</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Domain Approval Queue</h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-400">
            Review creative submissions assigned to your domain before publication to the public website.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-5 rounded-2xl bg-[#0f0f18] border border-white/10 flex flex-wrap items-center justify-between gap-4">
        
        {/* Domain Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400">DOMAIN:</span>
          <SelectField value={selectedDomainFilter} onChange={setSelectedDomainFilter} disabled={role === 'domain_admin' && assignedDomain} className="h-9 w-48 text-xs" options={[...(role !== 'domain_admin' ? [{ value: 'all', label: 'All domains' }] : []), ...domains.map((domain) => ({ value: domain._id, label: domain.name }))]} />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400">STATUS:</span>
          {['all', 'under_review', 'approved', 'changes_requested', 'rejected'].map(
            (status) => (
              <button
                key={status}
                onClick={() => setSelectedStatusFilter(status)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-mono capitalize transition-all',
                  selectedStatusFilter === status
                    ? 'bg-red-600 text-white font-medium'
                    : 'bg-white/5 text-gray-400 hover:text-white'
                )}
              >
                {status.replace('_', ' ')}
              </button>
            )
          )}
        </div>

      </div>

      {/* Submissions List */}
      {queueError && <p className="text-sm text-red-300" role="alert">{queueError}</p>}
      <div className="space-y-4">
        {queueItems.length > 0 ? (
          queueItems.map((sub) => (
            <Card
              key={sub.id}
              className="approval-item p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-red-500/40"
              hoverEffect={true}
            >
              <div className="flex items-start gap-5 min-w-0">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-black/70 shrink-0 border border-white/10">
                  <img
                    src={sub.thumbnail || sub.mediaUrl}
                    alt={sub.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-red-400 font-semibold">
                      {sub.domainName}
                    </span>
                    <span className="text-gray-600">•</span>
                    <span className="text-xs font-mono text-gray-400">{sub.type}</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-xs font-mono text-gray-500">{sub.date}</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white truncate">
                    {sub.title}
                  </h3>

                  <p className="mt-1 text-xs text-gray-400 line-clamp-1">
                    {sub.description}
                  </p>

                  <div className="mt-2 text-xs text-gray-300">
                    Creator: <span className="text-white font-medium">{sub.author}</span> ({sub.authorEmail})
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0 w-full md:w-auto justify-end">
                <StatusPill status={sub.status} />

                <Button
                  variant="primary"
                  size="sm"
                  icon={Eye}
                  onClick={() => setReviewModalSub(sub)}
                >
                  Review Work
                </Button>

                {sub.status === 'approved' && (
                  <Button
                    variant="glow"
                    size="sm"
                    icon={Globe}
                    onClick={() => handlePublish(sub)}
                  >
                    Publish
                  </Button>
                )}
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-20 rounded-2xl bg-white/[0.02] border border-white/5">
            <CheckSquare className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-300">Queue is Clear!</h3>
            <p className="text-xs text-gray-500 mt-1">
              No creative submissions currently matching this domain and status filter.
            </p>
          </div>
        )}
      </div>

      {/* Review & Decision Modal */}
      {reviewModalSub && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in"
          onClick={() => setReviewModalSub(null)}
        >
          <div
            className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#0f0f18] border border-red-500/30 p-6 sm:p-8 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-mono uppercase text-red-400">
                  {reviewModalSub.domainName} • Review Studio
                </span>
                <h2 className="text-2xl font-extrabold text-white mt-1">
                  {reviewModalSub.title}
                </h2>
                <div className="text-xs text-gray-400 mt-0.5">
                  Submitted by {reviewModalSub.author} on {reviewModalSub.date}
                </div>
              </div>
              <button
                onClick={() => setReviewModalSub(null)}
                className="p-1.5 rounded-lg bg-white/10 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Media Preview */}
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black/80 mb-6 border border-white/10">
              <img
                src={reviewModalSub.mediaUrl}
                alt={reviewModalSub.title}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Concept Note */}
            <div className="mb-6 p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="text-xs font-mono uppercase text-gray-400 mb-1">
                Artist Concept Note:
              </div>
              <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
                {reviewModalSub.description}
              </p>
            </div>

            {/* Review Feedback Note Input */}
            <div className="mb-6">
              <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
                Reviewer Feedback / Revision Instructions
              </label>
              <textarea
                rows={3}
                placeholder="Leave commendation, artistic feedback, or specific revision directives..."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 text-xs sm:text-sm resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  icon={X}
                  onClick={() => handleDecision(reviewModalSub, 'rejected')}
                >
                  Reject
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={AlertCircle}
                  onClick={() => handleDecision(reviewModalSub, 'changes_requested')}
                >
                  Request Changes
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Check}
                  onClick={() => handleDecision(reviewModalSub, 'approved')}
                >
                  Approve Creation
                </Button>
                <Button
                  variant="glow"
                  size="sm"
                  icon={Globe}
                  onClick={() => handlePublish(reviewModalSub)}
                >
                  Publish to Live Site
                </Button>
              </div>
              {reviewError && <p className="w-full text-sm text-red-300" role="alert">{reviewError}</p>}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default DomainAdminQueue;
