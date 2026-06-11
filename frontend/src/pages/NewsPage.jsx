import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Newspaper, RefreshCw, Compass, Briefcase, ChevronRight, ExternalLink, Clock, Tag } from 'lucide-react';
import { portfolioService } from '../services/api';
import Skeleton from '../components/ui/Skeleton';

import { getApiBaseUrl } from '../utils/config';

const API_BASE = getApiBaseUrl();

// Public axios instance — no auth header so news endpoints don't trigger 401
const publicApi = axios.create({ baseURL: API_BASE, timeout: 12000 });

const fetchMarketNews = () => publicApi.get('/news').then(r => r.data);
const fetchStockNews  = (symbol) => publicApi.get(`/news/${symbol}`).then(r => r.data);

// ─── News Card Component ──────────────────────────────────────────────────────

function NewsCard({ headline, summary, source, url, datetime, image, related }) {
  const timeAgo = (ts) => {
    if (!ts) return '';
    const seconds = Math.floor(Date.now() / 1000) - ts;
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <a
      href={url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5"
    >
      {/* Image */}
      {image && (
        <div className="h-36 overflow-hidden flex-shrink-0">
          <img
            src={image}
            alt={headline}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      )}

      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Source + Time */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {related && (
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                <Tag size={8} />{related}
              </span>
            )}
            <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider">{source}</span>
          </div>
          <span className="text-[9px] text-slate-500 font-semibold flex items-center gap-1 flex-shrink-0">
            <Clock size={9} />{timeAgo(datetime)}
          </span>
        </div>

        {/* Headline */}
        <h3 className="text-xs font-bold text-slate-100 group-hover:text-emerald-300 transition-colors leading-snug line-clamp-3">
          {headline || 'Untitled Article'}
        </h3>

        {/* Summary */}
        {summary && (
          <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2 flex-1">
            {summary}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center gap-1 text-[9px] text-slate-500 group-hover:text-emerald-400 transition-colors pt-1 border-t border-slate-800/60 mt-auto">
          <ExternalLink size={9} />
          <span>Read full article</span>
        </div>
      </div>
    </a>
  );
}

// ─── Skeleton Grid ────────────────────────────────────────────────────────────

function NewsSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array(6).fill(0).map((_, i) => (
        <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <Skeleton className="h-36 w-full" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NewsPage() {
  const [activeFilter, setActiveFilter] = useState('market'); // 'market' | 'portfolio'

  // General market news
  const {
    data: news = [],
    isLoading: newsLoading,
    isError: newsError,
    refetch,
  } = useQuery('market-news-v3', fetchMarketNews, {
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000, // 10 min
    retry: 1,
  });

  // Portfolio holdings (to filter news)
  const { data: portfolio } = useQuery('portfolio', () => portfolioService.get(), {
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
  const holdingSymbols = new Set((portfolio?.holdings || []).map(h => h.symbol?.toUpperCase()));

  // Per-holding news queries (only if on portfolio tab and user has holdings)
  const holdingSymbolsList = [...holdingSymbols].slice(0, 3); // Limit to 3 to save API calls
  const { data: holdingNews = [] } = useQuery(
    ['portfolio-news', holdingSymbolsList.join(',')],
    async () => {
      if (holdingSymbolsList.length === 0) return [];
      const results = await Promise.all(
        holdingSymbolsList.map(sym => fetchStockNews(sym).catch(() => []))
      );
      return results.flat();
    },
    {
      enabled: activeFilter === 'portfolio' && holdingSymbolsList.length > 0,
      staleTime: 15 * 60 * 1000,
      retry: 1,
    }
  );

  // What news to display
  const displayedNews = (() => {
    if (activeFilter === 'portfolio') {
      if (holdingSymbolsList.length === 0) return [];
      if (holdingNews.length > 0) return holdingNews;
      // Fallback: filter market news by symbol mentions
      return news.filter(item => {
        const rel = (item.related || '').toUpperCase();
        const head = (item.headline || '').toUpperCase();
        return holdingSymbols.has(rel) || [...holdingSymbols].some(sym => head.includes(sym));
      });
    }
    return news;
  })();

  const handleRefresh = () => refetch();

  return (
    <div className="space-y-8 animate-fadeIn font-sans">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
              <Newspaper className="text-white w-4 h-4" />
            </div>
            Financial Intelligence
          </h1>
          <p className="text-xs text-slate-400 mt-1 ml-10.5">
            Real-time macroeconomic coverage and stock-specific reports from Finnhub &amp; Marketaux.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300 px-4 py-2 rounded-xl transition text-xs font-bold self-start sm:self-auto flex-shrink-0"
        >
          <RefreshCw size={13} className={newsLoading ? 'animate-spin' : ''} />
          Refresh News
        </button>
      </div>

      {/* API Source badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Powered by</span>
        {['Finnhub', 'Marketaux', 'NewsData.io'].map(src => (
          <span key={src} className="bg-slate-900 border border-slate-800 text-cyan-400 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
            {src}
          </span>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-900/60 pb-px">
        <button
          id="news-tab-market"
          onClick={() => setActiveFilter('market')}
          className={`flex items-center gap-2 px-6 py-3.5 border-b-2 font-bold text-xs transition-colors -mb-px ${
            activeFilter === 'market'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <Compass size={14} />
          Broad Market News
        </button>
        <button
          id="news-tab-portfolio"
          onClick={() => setActiveFilter('portfolio')}
          className={`flex items-center gap-2 px-6 py-3.5 border-b-2 font-bold text-xs transition-colors -mb-px ${
            activeFilter === 'portfolio'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <Briefcase size={14} />
          My Positions News
          {holdingSymbols.size > 0 && (
            <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-black px-1.5 py-0.5 rounded-full">
              {holdingSymbols.size}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {newsLoading ? (
        <NewsSkeletonGrid />
      ) : newsError ? (
        <div className="glass-card rounded-2xl border-slate-900 p-12 text-center max-w-2xl mx-auto shadow-2xl">
          <div className="inline-flex p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-red-400 mb-5 shadow-inner">
            <Newspaper size={32} />
          </div>
          <h3 className="text-lg font-extrabold text-slate-100 mb-2">News Temporarily Unavailable</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6 leading-relaxed">
            All news APIs returned errors. Check your API keys in <code className="text-cyan-400 font-mono text-[10px]">backend/.env</code>.
          </p>
          <button
            onClick={handleRefresh}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs px-6 py-3 rounded-xl transition shadow-lg inline-flex items-center gap-1.5"
          >
            <RefreshCw size={13} /> Try Again
          </button>
        </div>
      ) : activeFilter === 'portfolio' && holdingSymbols.size === 0 ? (
        <div className="glass-card rounded-2xl border-slate-900 p-12 text-center max-w-2xl mx-auto shadow-2xl">
          <div className="inline-flex p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 mb-5 shadow-inner">
            <Briefcase size={32} />
          </div>
          <h3 className="text-lg font-extrabold text-slate-100 mb-2">No Position News Available</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6 leading-relaxed">
            You don't hold any stocks yet. Purchase shares of high-profile companies to see curated news for your holdings.
          </p>
          <Link
            to="/market"
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs px-6 py-3 rounded-xl transition shadow-lg shadow-emerald-500/10 inline-flex items-center gap-1.5"
          >
            Go to Market Terminal <ChevronRight size={13} />
          </Link>
        </div>
      ) : displayedNews.length === 0 ? (
        <div className="glass-card rounded-2xl border-slate-900 p-12 text-center max-w-2xl mx-auto">
          <div className="inline-flex p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 mb-5">
            <Newspaper size={32} />
          </div>
          <h3 className="text-lg font-extrabold text-slate-100 mb-2">No Articles Found</h3>
          <p className="text-xs text-slate-400 mb-6">No news matched the current filter. Try refreshing.</p>
          <button onClick={handleRefresh} className="bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold px-5 py-2.5 rounded-xl inline-flex items-center gap-2 hover:bg-slate-700 transition">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedNews.map((item, i) => (
            <NewsCard
              key={item.id || item.uuid || `news-${i}`}
              headline={item.headline || item.title}
              summary={item.summary || item.description || ''}
              source={item.source}
              url={item.url}
              datetime={item.datetime}
              image={item.image || item.image_url || ''}
              related={item.related ? item.related.split(',')[0] : ''}
            />
          ))}
        </div>
      )}
    </div>
  );
}
