import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PostLightboxModal } from '../../components/modals/PostLightboxModal';
import { cn } from '../../utils/cn';
import { usePublicData, PublicDataState } from '../../hooks/usePublicData';

const FILTER_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Events', value: 'Events' },
  { label: 'Performances', value: 'Performances' },
  { label: 'Behind the Scenes', value: 'Behind the Scenes' },
  { label: 'Creations', value: 'Creations' },
];

export const Gallery = () => {
  const { data: records, loading, error } = usePublicData('/posts', { params: { limit: 50 } });
  const publishedPosts = records.map((post) => ({ ...post, id: post._id, mediaUrl: post.media?.[0]?.url || '', thumbnail: post.media?.[0]?.thumbnailUrl || post.media?.[0]?.url || '', domainName: post.domain?.name || '', author: post.author ? `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() : '', type: post.contentType, category: post.tags?.[0] || post.contentType, date: post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : '', likes: 0 }));

  const [activeTab, setActiveTab] = useState('all');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [activeModalPost, setActiveModalPost] = useState(null);
  const [likedPosts, setLikedPosts] = useState(new Set());

  const handleToggleLike = (postId) => {
    void postId;
    setLikedPosts((prev) => {
      const updated = new Set(prev);
      updated.add(postId);
      return updated;
    });
  };

  const filteredPosts = publishedPosts.filter((post) => {
    if (activeTab === 'all') return true;
    return post.category?.toLowerCase().includes(activeTab.toLowerCase()) || post.domainName.toLowerCase().includes(activeTab.toLowerCase());
  });

  const totalSlides = Math.max(0, filteredPosts.length - 2);

  const handlePrev = () => {
    setCarouselIndex((prev) => (prev === 0 ? Math.max(0, totalSlides - 1) : prev - 1));
  };

  const handleNext = () => {
    setCarouselIndex((prev) => (prev >= totalSlides - 1 ? 0 : prev + 1));
  };

  // Get 5 visible posts starting from current index (wrap around)
  const getVisiblePosts = () => {
    if (filteredPosts.length === 0) return [];
    const result = [];
    for (let i = 0; i < 5; i++) {
      result.push(filteredPosts[(carouselIndex + i) % filteredPosts.length]);
    }
    return result;
  };

  const visiblePosts = getVisiblePosts();

  return (
    <div className="public-page max-w-7xl mx-auto text-gray-100 flex flex-col">

      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-red-400 font-bold mb-2 block">
            FEATURED GALLERY
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase leading-tight font-display">
            MOMENTS THAT{' '}
            <span className="text-red-500 drop-shadow-[0_0_25px_rgba(255,30,56,0.5)]">
              DEFINE US
            </span>
          </h1>
        </div>

        {/* Filter Pills — matching reference (dark pill style, active = red filled) */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {FILTER_TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => {
                  setActiveTab(tab.value);
                  setCarouselIndex(0);
                }}
                className={cn(
                  'px-5 py-2 rounded-full text-sm font-semibold tracking-wide transition-all cursor-pointer border',
                  isActive
                    ? 'bg-red-600 text-white font-bold shadow-[0_0_20px_rgba(255,30,56,0.5)] border-red-600'
                    : 'bg-transparent text-gray-300 hover:text-white border-white/20 hover:border-white/40'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Panoramic Scattered Carousel — matching reference layout */}
      <PublicDataState loading={loading} error={error}>
      {filteredPosts.length > 0 ? (
        <div className="relative w-full mt-4">

          {/* Left Arrow */}
          <button
            onClick={handlePrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 z-30 w-12 h-12 rounded-full bg-[#0e0e18]/90 border border-white/20 hover:border-red-500/60 hover:bg-red-600/20 text-gray-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xl backdrop-blur-md"
            title="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Stacked/Scattered Panoramic Photo Grid */}
          <div className="mx-14 relative">
            {/* Top Row: 3 larger cards (first 3 visible) */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {visiblePosts.slice(0, 3).map((post, idx) => (
                <div
                  key={post.id + '-top-' + idx}
                  onClick={() => setActiveModalPost(post)}
                  className={cn(
                    'group relative rounded-2xl overflow-hidden bg-[#0a0a12] border border-white/10 hover:border-red-500/50 shadow-2xl transition-all duration-500 cursor-pointer',
                    idx === 0 ? 'aspect-[4/3]' : idx === 1 ? 'aspect-[4/3]' : 'aspect-[4/3]'
                  )}
                >
                  <img
                    src={post.mediaUrl}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-xs font-bold text-white truncate">{post.title}</p>
                    <p className="text-[10px] text-gray-300 font-mono">{post.domainName}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Row: 2 offset cards (last 2 visible) — matching reference staggered layout */}
            {visiblePosts.length > 3 && (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4 px-[16.66%]">
                {visiblePosts.slice(3, 5).map((post, idx) => (
                  <div
                    key={post.id + '-bot-' + idx}
                    onClick={() => setActiveModalPost(post)}
                    className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#0a0a12] border border-white/10 hover:border-red-500/50 shadow-2xl transition-all duration-500 cursor-pointer"
                  >
                    <img
                      src={post.mediaUrl}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <p className="text-xs font-bold text-white truncate">{post.title}</p>
                      <p className="text-[10px] text-gray-300 font-mono">{post.domainName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Arrow */}
          <button
            onClick={handleNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 z-30 w-12 h-12 rounded-full bg-[#0e0e18]/90 border border-white/20 hover:border-red-500/60 hover:bg-red-600/20 text-gray-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xl backdrop-blur-md"
            title="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Pagination Dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {Array.from({ length: Math.min(filteredPosts.length, 6) }).map((_, dot) => (
              <button
                key={dot}
                type="button"
                onClick={() => setCarouselIndex(dot)}
                className={cn(
                  'h-2 rounded-full transition-all cursor-pointer',
                  carouselIndex === dot ? 'w-6 bg-red-500' : 'w-2 bg-white/25 hover:bg-white/40'
                )}
              />
            ))}
          </div>

        </div>
      ) : (
        <div className="text-center py-20 rounded-2xl bg-white/[0.02] border border-white/5 mt-4">
          <p className="text-sm text-gray-400">No moments found for this category.</p>
        </div>
      )}
      </PublicDataState>

      {/* Lightbox Modal */}
      <PostLightboxModal
        post={activeModalPost}
        isOpen={!!activeModalPost}
        onClose={() => setActiveModalPost(null)}
        isLiked={activeModalPost ? likedPosts.has(activeModalPost.id) : false}
        onLike={(id) => handleToggleLike(id)}
      />

    </div>
  );
};

export default Gallery;
