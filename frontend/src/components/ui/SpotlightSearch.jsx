import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Compass, TrendingUp, Sparkles, X } from 'lucide-react';

const PAGES = [
  { label: 'Dashboard', path: '/', category: 'Navigation', icon: Compass },
  { label: 'Market Terminals', path: '/market', category: 'Navigation', icon: TrendingUp },
  { label: 'My Portfolio', path: '/portfolio', category: 'Navigation', icon: Compass },
  { label: 'Advanced Analytics', path: '/analytics', category: 'Navigation', icon: Sparkles },
  { label: 'Leaderboard rankings', path: '/leaderboard', category: 'Navigation', icon: Sparkles },
  { label: 'Alerts & Targets', path: '/alerts', category: 'Navigation', icon: Compass },
  { label: 'My Watchlist', path: '/watchlist', category: 'Navigation', icon: Compass },
  { label: 'Global News Feed', path: '/news', category: 'Navigation', icon: Compass },
  { label: 'User Settings', path: '/settings', category: 'Navigation', icon: Compass },
  { label: 'My Profile', path: '/profile', category: 'Navigation', icon: Compass },
];

const STOCKS = [
  { symbol: 'AAPL', label: 'Apple Inc.', category: 'Stocks' },
  { symbol: 'MSFT', label: 'Microsoft Corporation', category: 'Stocks' },
  { symbol: 'NVDA', label: 'NVIDIA Corporation', category: 'Stocks' },
  { symbol: 'TSLA', label: 'Tesla Inc.', category: 'Stocks' },
  { symbol: 'AMZN', label: 'Amazon.com Inc.', category: 'Stocks' },
  { symbol: 'GOOGL', label: 'Alphabet Inc.', category: 'Stocks' },
  { symbol: 'META', label: 'Meta Platforms Inc.', category: 'Stocks' },
  { symbol: 'NFLX', label: 'Netflix Inc.', category: 'Stocks' },
  { symbol: 'AMD', label: 'Advanced Micro Devices', category: 'Stocks' },
  { symbol: 'COIN', label: 'Coinbase Global Inc.', category: 'Stocks' },
];

export default function SpotlightSearch({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setSelectedIndex(0);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Combine items matching search
  const filteredPages = PAGES.filter(p =>
    p.label.toLowerCase().includes(query.toLowerCase())
  );
  
  const filteredStocks = STOCKS.filter(s =>
    s.symbol.toLowerCase().includes(query.toLowerCase()) ||
    s.label.toLowerCase().includes(query.toLowerCase())
  );

  const results = [
    ...filteredPages.map(p => ({ ...p, type: 'page' })),
    ...filteredStocks.map(s => ({ ...s, type: 'stock', label: `${s.symbol} - ${s.label}`, path: `/market/${s.symbol}` }))
  ];

  // Keyboard navigation listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(results.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(results.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          navigate(results[selectedIndex].path);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, results]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-start justify-center pt-24 px-4 animate-fadeIn">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div
        ref={modalRef}
        className="w-full max-w-xl glass-card rounded-2xl overflow-hidden shadow-2xl border-slate-800 flex flex-col relative animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input area */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800/80">
          <Search className="text-slate-400 w-5 h-5 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, stocks, tickers (e.g. AAPL)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent border-0 outline-none text-slate-100 text-sm placeholder-slate-500 focus:ring-0"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-slate-800/80 text-[10px] text-slate-400 font-mono border border-slate-700/50">
            ESC
          </kbd>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-slate-200">
            <X size={16} />
          </button>
        </div>

        {/* Results area */}
        <div className="max-h-[360px] overflow-y-auto p-2 scrollbar-none">
          {results.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
              <Search className="w-8 h-8 text-slate-600 animate-pulse" />
              <span>No results found for "{query}"</span>
            </div>
          ) : (
            <div>
              {/* Category groupings could be styled nicely, but standard listing with selected state is premium */}
              {results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const Icon = item.icon || TrendingUp;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      navigate(item.path);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500 pl-2.5'
                        : 'text-slate-300 hover:bg-slate-900/40 hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <span className="text-[10px] uppercase font-semibold font-mono tracking-wider text-slate-500 px-2 py-0.5 rounded bg-slate-900/50 border border-slate-800/50">
                      {item.category}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span>StockSim Command Console</span>
        </div>
      </div>
    </div>
  );
}
