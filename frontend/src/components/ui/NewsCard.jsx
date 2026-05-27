import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Newspaper, ExternalLink } from 'lucide-react';

export default function NewsCard({ headline, summary, source, datetime, image, url, related }) {
  const dateObj = new Date(datetime * 1000);
  let timeStr = 'Some time ago';
  try {
    timeStr = formatDistanceToNow(dateObj, { addSuffix: true });
  } catch (e) {}

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="glass-card rounded-2xl border-slate-900/60 p-4 flex gap-4 hover:border-slate-800 hover:bg-slate-900/20 transition-all duration-300 group shadow-sm overflow-hidden relative"
    >
      {/* Article thumbnail */}
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-950 flex-shrink-0 border border-slate-900 relative">
        {image ? (
          <img src={image} alt="News thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-900">
            <Newspaper size={24} />
          </div>
        )}
      </div>

      {/* Article body */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center justify-between gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            <span>{source || 'General'}</span>
            <span>{timeStr}</span>
          </div>
          <h4 className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
            {headline}
          </h4>
          <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 leading-normal">
            {summary}
          </p>
        </div>

        {/* Tags */}
        <div className="flex items-center justify-between mt-2">
          {related ? (
            <span className="text-[8px] font-extrabold font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded uppercase">
              {related}
            </span>
          ) : (
            <span />
          )}
          <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1 group-hover:text-slate-300 transition-colors">
            Read <ExternalLink size={10} />
          </span>
        </div>
      </div>
    </a>
  );
}
