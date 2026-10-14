import React from 'react';
import { X, Calendar, Heart, Share2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { notify } from '../../utils/notify';

export const PostLightboxModal = ({
  post,
  onClose,
  isLiked = false,
  onLike,
}) => {
  if (!post) return null;

  const handleShare = () => {
    if (!navigator.clipboard?.writeText) {
      notify({ type: 'error', title: 'Could not copy link', message: 'Copy the page address from your browser instead.' });
      return;
    }
    navigator.clipboard.writeText(window.location.href).then(
      () => notify({ type: 'success', title: 'Link copied', message: 'The creative link is ready to share.' }),
      () => notify({ type: 'error', title: 'Could not copy link', message: 'Copy the page address from your browser instead.' }),
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0f0f18] border border-purple-500/30 p-6 sm:p-8 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Media preview */}
        <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black/80 mb-6 border border-white/10 shadow-lg">
          <img
            src={post.mediaUrl}
            alt={post.title}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Post Details */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-purple-600/30 text-purple-200 border border-purple-500/40">
              {post.domainName}
            </span>
            <span className="text-xs font-mono uppercase px-2.5 py-1 rounded-full bg-white/5 text-gray-400 border border-white/10">
              {post.type}
            </span>
            <span className="text-xs font-mono text-gray-400 ml-auto flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {post.date}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            {post.title}
          </h2>

          <div className="text-sm font-medium text-purple-400 mt-1">
            Artist / Creator: {post.author}
          </div>

          <p className="mt-4 text-sm sm:text-base text-gray-300 leading-relaxed">
            {post.description}
          </p>

          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
            {onLike ? (
              <button
                onClick={() => onLike(post.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 border border-pink-500/30 font-mono text-xs transition-colors"
              >
                <Heart className={cn('w-4 h-4', isLiked && 'fill-current')} />
                <span>{post.likes + (isLiked ? 1 : 0)} Applauds</span>
              </button>
            ) : (
              <div />
            )}

            <Button
              variant="glass"
              size="sm"
              icon={Share2}
              onClick={handleShare}
            >
              Share Link
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostLightboxModal;
