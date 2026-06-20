import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  ArrowLeft, Clock, User, Tag, Calendar, ChevronRight, BookOpen, 
  Share2, MessageSquare, AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { triggerToast } from '../utils/errorHandler';

export default function Blog() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [currentPost, setCurrentPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch all published posts
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      setError('');
      try {
        const q = query(
          collection(db, 'blogs'),
          where('published', '==', true)
        );
        const snap = await getDocs(q);
        const fetched = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Sort posts locally to prevent index-related Firestore queries failures
        fetched.sort((a, b) => {
          const orderA = a.order !== undefined ? Number(a.order) : 999;
          const orderB = b.order !== undefined ? Number(b.order) : 999;
          if (orderA !== orderB) return orderA - orderB;

          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });

        setPosts(fetched);

        if (slug) {
          const match = fetched.find(p => p.slug === slug);
          if (match) {
            setCurrentPost(match);
          } else {
            // Try fetching directly in case list is cached/partial
            const qSlug = query(collection(db, 'blogs'), where('slug', '==', slug), limit(1));
            const snapSlug = await getDocs(qSlug);
            if (!snapSlug.empty) {
              setCurrentPost({ id: snapSlug.docs[0].id, ...snapSlug.docs[0].data() });
            } else {
              setError('Article not found.');
            }
          }
        } else {
          setCurrentPost(null);
        }
      } catch (err) {
        console.error('[Blog] Fetch error:', err);
        setError('Failed to load blog database.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [slug]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center gap-4 relative z-10">
        <div className="w-8 h-8 border-[2px] border-[#5E0ED7]/30 border-t-[#5E0ED7] rounded-full animate-spin" />
        <span className="text-[10px] text-gray-500 font-bold tracking-[0.2em] uppercase font-mono">
          Syncing Articles...
        </span>
      </div>
    );
  }

  // Detail Blog Post Render
  if (slug && currentPost) {
    return (
      <div className="pt-28 pb-24 px-6 md:px-12 lg:px-16 relative z-10 max-w-4xl mx-auto">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#5E0ED7]/5 rounded-full blur-[120px] pointer-events-none -z-10" />

        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-gray-400 hover:text-white transition mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Articles</span>
        </Link>

        <article className="space-y-8">
          <div className="space-y-4">
            <span className="text-[9px] font-bold tracking-[0.2em] text-[#5E0ED7] bg-[#5E0ED7]/10 px-3 py-1 rounded-full uppercase font-mono inline-block">
              {currentPost.category || 'Technology'}
            </span>
            <h1 className="text-3xl md:text-5xl font-light text-white uppercase tracking-tight leading-tight">
              {currentPost.title}
            </h1>
            <p className="text-sm md:text-base text-gray-400 font-light leading-relaxed normal-case italic">
              {currentPost.summary}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-gray-500 pt-2 border-b border-white/5 pb-4">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span className="normal-case font-bold text-white">{currentPost.author || 'AutoScale Architect'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(currentPost.createdAt)}</span>
              </div>
              {currentPost.readTime && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{currentPost.readTime} Min Read</span>
                </div>
              )}
            </div>
          </div>

          {/* Body content */}
          <div 
            className="text-xs md:text-sm text-gray-300 font-light leading-relaxed normal-case space-y-6 blog-body markdown-content"
            style={{ whiteSpace: 'pre-wrap' }}
            dangerouslySetInnerHTML={{ __html: currentPost.content }}
          />

          {/* Social shares */}
          <div className="border-t border-white/10 pt-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  triggerToast('Article link copied to clipboard!', 'success');
                }}
                className="p-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 text-gray-400 hover:text-white transition"
                title="Copy Link"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            <Link
              to="/free-audit"
              className="px-5 py-3 bg-[#5E0ED7] hover:bg-[#4d09b3] text-[10px] font-bold tracking-widest uppercase rounded-xl transition text-white"
            >
              Request Free Systems Audit
            </Link>
          </div>
        </article>
      </div>
    );
  }

  // Error state
  if (slug && error) {
    return (
      <div className="pt-28 pb-24 px-6 relative z-10 max-w-xl mx-auto text-center flex flex-col items-center gap-6">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <div>
          <h2 className="text-xl font-normal text-white uppercase tracking-wider">Article Not Found</h2>
          <p className="text-xs text-gray-500 mt-2 normal-case">The article slug you requested could not be resolved in the CMS.</p>
        </div>
        <Link
          to="/blog"
          className="px-5 py-3 border border-white/10 text-xs font-semibold uppercase tracking-wider text-white hover:bg-white/5 rounded-xl transition flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Blog Index</span>
        </Link>
      </div>
    );
  }

  // Blog list view
  return (
    <div className="pt-28 pb-24 px-6 md:px-12 lg:px-16 relative z-10 max-w-6xl mx-auto space-y-12">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#5E0ED7]/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Header */}
      <div className="text-center space-y-4">
        <span className="text-[10px] font-bold tracking-[0.25em] text-[#5E0ED7] uppercase block mb-2 font-mono">
          SEO CONTENT HUB
        </span>
        <h1 className="text-3xl md:text-5xl font-light text-white uppercase tracking-tight leading-tight">
          AUTOSCALE INSIGHTS
        </h1>
        <p className="text-xs text-gray-400 max-w-lg mx-auto font-light leading-relaxed normal-case">
          Deep-dives, blueprints, and strategies on business systems, lead automation, workflows, and operations scale.
        </p>
      </div>

      {/* Grid List */}
      {posts.length === 0 ? (
        <div className="p-12 rounded-[24px] border border-white/5 bg-white/[0.01] text-center max-w-md mx-auto space-y-3">
          <BookOpen className="w-10 h-10 text-gray-600 mx-auto" />
          <p className="text-xs text-gray-400 font-light normal-case">No published blog articles found in CMS database.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.id}
              to={`/blog/${post.slug}`}
              className="group rounded-2xl border border-white/5 bg-white/[0.01] p-6 hover:border-white/20 transition-all duration-300 flex flex-col justify-between gap-6 hover:shadow-[0_0_20px_rgba(94,14,215,0.05)] cursor-target"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold tracking-wider text-gray-500 uppercase font-mono">{post.category || 'SYSTEMS'}</span>
                  <span className="text-[8px] font-mono text-gray-600">{formatDate(post.createdAt)}</span>
                </div>
                <h3 className="text-sm font-bold text-white uppercase group-hover:text-[#5E0ED7] transition duration-200 line-clamp-2 leading-tight">
                  {post.title}
                </h3>
                <p className="text-[11px] text-gray-400 font-light leading-relaxed normal-case line-clamp-3">
                  {post.summary}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5 text-[9px] font-mono text-gray-500">
                <span className="normal-case">{post.author || 'AutoScale Architect'}</span>
                <span className="flex items-center gap-1 group-hover:text-white transition">
                  Read Article <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
