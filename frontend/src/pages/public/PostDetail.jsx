import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePublicData, PublicDataState } from '../../hooks/usePublicData';

export const PostDetail = () => {
  const { slug } = useParams();
  const { data: post, loading, error } = usePublicData(`/posts/${slug}`, { initialValue: null });
  const media = post?.media || [];
  const author = post?.author ? `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() : '';
  return <main className="public-page mx-auto max-w-5xl text-gray-100"><Link to="/gallery" className="mb-8 inline-flex items-center gap-2 text-sm text-red-300"><ArrowLeft size={16} /> Gallery</Link><PublicDataState loading={loading} error={error} empty="This work is not available." isEmpty={!post}><article><p className="text-xs uppercase tracking-[.2em] text-red-300">{post?.domain?.name}</p><h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">{post?.title}</h1><p className="mt-3 text-sm text-gray-400">{author}{author && post?.publishedAt ? ' · ' : ''}{post?.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ''}</p><div className="mt-7 grid gap-4 sm:grid-cols-2">{media.map((item) => item.mediaType === 'video' ? <video key={item._id} src={item.url} controls poster={item.thumbnailUrl} className="w-full rounded-2xl border border-white/10" /> : <img key={item._id} src={item.url} alt={post.title} className="w-full rounded-2xl border border-white/10 object-cover" />)}</div><p className="mt-7 whitespace-pre-line leading-7 text-gray-300">{post?.description}</p>{post?.articleContent && <div className="prose prose-invert mt-8 max-w-none whitespace-pre-line">{post.articleContent}</div>}</article></PublicDataState></main>;
};

export default PostDetail;
