import React from 'react';
import { Heart } from 'lucide-react';
import { cn } from '../../utils/cn';

export const PostCard = ({
  post,
  isLiked = false,
  onLike,
  onClick,
  className,
}) => {
  const currentLikes = post.likes + (isLiked ? 1 : 0);

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative rounded-2xl overflow-hidden bg-[#0d0d16] border border-white/10 hover:border-red-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-red-950/40 flex flex-col cursor-pointer',
        className
      )}
    >
      {/* Media Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-black/70">
        <img
          src={post.thumbnail || post.mediaUrl}
          alt={post.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d16] via-transparent to-transparent opacity-80" />

        {/* Domain Tag */}
        <div className="absolute top-3 left-3">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/20">
            {post.domainName}
          </span>
        </div>

        {/* Like Button */}
        {onLike && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onLike(post.id);
            }}
            className={cn(
              'absolute top-3 right-3 flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full backdrop-blur-md transition-colors',
              isLiked
                ? 'bg-pink-600/80 text-white'
                : 'bg-black/60 text-pink-300 hover:bg-black/80'
            )}
          >
            <Heart className={cn('w-3.5 h-3.5', isLiked && 'fill-current')} />
            <span>{currentLikes}</span>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-white group-hover:text-red-300 transition-colors line-clamp-1">
            {post.title}
          </h3>
          <p className="mt-2 text-xs text-gray-400 line-clamp-2 leading-relaxed">
            {post.description}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
          <span className="text-gray-300 font-medium">By {post.author}</span>
          <span className="font-mono text-[11px]">{post.date}</span>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
