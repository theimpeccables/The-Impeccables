import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { usePublicData, PublicDataState } from '../../hooks/usePublicData';
import {
  ArrowLeft,
  CheckCircle2,
  UploadCloud,
  Heart,
  Palette,
  Camera,
  Film,
  Layout,
  Feather,
  Mic,
  Sparkles,
} from 'lucide-react';

const domainIcons = {
  'creative-arts': Palette,
  photography: Camera,
  cinematics: Film,
  'graphic-design': Layout,
  'content-writing': Feather,
  'personality-dev': Sparkles,
  'open-mic': Mic,
};

export const DomainDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: domain } = usePublicData(`/domains/${slug}`, { initialValue: null });
  const { data: rawPosts, loading: postsLoading, error: postsError } = usePublicData('/posts', { params: { domain: slug, limit: 50 } });

  if (!domain) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-bold text-white">Domain Not Found</h2>
        <p className="mt-2 text-gray-400">The requested creative domain could not be found.</p>
        <Button variant="primary" className="mt-6" onClick={() => navigate('/domains')}>
          Back to All Domains
        </Button>
      </div>
    );
  }

  const Icon = domainIcons[domain.slug] || Sparkles;
  const domainPosts = rawPosts.map((post) => ({ ...post, id: post._id, mediaUrl: post.media?.[0]?.url || '', thumbnail: post.media?.[0]?.thumbnailUrl || post.media?.[0]?.url || '', author: post.author ? `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() : 'Impeccables member', date: post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : '', likes: 0 }));

  return (
    <div className="public-page max-w-7xl mx-auto text-gray-100">
      
      {/* Back button */}
      <Link
        to="/domains"
        className="inline-flex items-center gap-2 text-xs font-mono text-red-400 hover:text-red-300 mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to All Domains
      </Link>

      {/* Hero Banner */}
      <div className="relative rounded-3xl bg-[#0c0c14] border border-white/10 p-8 sm:p-12 overflow-hidden shadow-2xl mb-16">
        <div
          className="pointer-events-none absolute -right-20 -top-20 w-96 h-96 rounded-full blur-[140px] opacity-25"
          style={{ backgroundColor: domain.color }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
          
          <div className="lg:col-span-8">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-lg"
                style={{
                  backgroundColor: `${domain.color}25`,
                  borderColor: `${domain.color}50`,
                  color: domain.color,
                }}
              >
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono uppercase tracking-widest text-red-400 font-semibold">
                Official Creative Domain
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight uppercase font-display">
              {domain.name}
            </h1>

          <p className="mt-3 text-lg font-mono text-gray-300 italic">
              “{domain.tagline || domain.shortDescription}”
            </p>

            <p className="mt-4 text-base text-gray-400 leading-relaxed max-w-2xl">
              {domain.description}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={() => navigate('/dashboard/submit')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(255,30,56,0.5)] transition-all cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Submit Work for {domain.name}</span>
              </button>
              <button
                onClick={() => navigate('/team')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
              >
                Meet Domain Members
              </button>
            </div>
          </div>

          {/* Lead Card Sidebar */}
          <div className="lg:col-span-4">
            <Card className="bg-[#10101a] border-red-500/20">
              <div className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-4">
                Domain Head
              </div>
              <div className="text-xl font-bold text-white">{domain.leadName}</div>
              <div className="text-xs font-mono text-red-400 mt-0.5">{domain.leadRole}</div>

              <div className="mt-6 pt-4 border-t border-white/5 space-y-3 text-xs">
                <div className="flex items-center justify-between text-gray-300">
                  <span>Active Members:</span>
              <span className="font-mono text-white font-semibold">{domain.memberCount ?? '—'} Artists</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <span>Output Metric:</span>
                  <span className="font-mono text-white font-semibold">{domain.stats}</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <span>Review Workflow:</span>
                  <span className="font-mono text-emerald-400">Domain Queue Active</span>
                </div>
              </div>
            </Card>
          </div>

        </div>
      </div>

      {/* Core Competencies */}
      <div className="mb-20">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-red-400" />
          Core Disciplines & Technical Stack
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {(domain.skills || []).map((skill) => (
            <div
              key={skill}
              className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-center text-xs font-mono text-gray-200"
            >
              {skill}
            </div>
          ))}
        </div>
      </div>

      {/* Domain's Approved Gallery Posts */}
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-bold text-white">Approved Works in {domain.name}</h3>
            <p className="text-xs text-gray-400 mt-1">
              Publicly displayed creative output from active members of this domain.
            </p>
          </div>
          <Link
            to="/gallery"
            className="text-xs font-mono text-red-400 hover:text-red-300"
          >
            All Gallery Works →
          </Link>
        </div>

        <PublicDataState loading={postsLoading} error={postsError}>
        {domainPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {domainPosts.map((post) => (
              <div
                key={post.id}
                className="group rounded-2xl overflow-hidden bg-[#0c0c14] border border-white/10 hover:border-red-500/40 transition-all flex flex-col shadow-lg"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-black/60">
                  <img
                    src={post.thumbnail || post.mediaUrl}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-red-300">
                    <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                    <span>{post.likes}</span>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-base font-bold text-white line-clamp-1">{post.title}</h4>
                    <p className="mt-2 text-xs text-gray-400 line-clamp-2">{post.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
                    <span>By {post.author}</span>
                    <span className="font-mono text-[11px]">{post.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 rounded-2xl border border-white/5 bg-white/[0.02]">
            <p className="text-sm text-gray-400">No public submissions in this domain yet.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigate('/dashboard/submit')}
            >
              Submit the First Creation
            </Button>
          </div>
        )}
        </PublicDataState>
      </div>

    </div>
  );
};

export default DomainDetail;
