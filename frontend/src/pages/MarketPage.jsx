import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Search, TrendingUp, TrendingDown, Star, ChevronRight } from 'lucide-react';
import { stockService, watchlistService } from '../services/api';
import { useMarketTickerSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';
import Skeleton from '../components/ui/Skeleton';

const SECTORS = ['All', 'Technology', 'Finance', 'Healthcare', 'Consumer', 'Energy', 'Entertainment', 'Automotive', 'Aerospace'];

export default function MarketPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('All');
  const [sort, setSort] = useState('marketCap');
  const [livePrices, setLivePrices] = useState({});

  // 1. Fetch stocks
  const { data: stockData, isLoading: isStocksLoading } = useQuery('stocks', () =>
    stockService.getAll().then(r => r.data.data)
  );
  const stocks = Array.isArray(stockData) ? stockData : (stockData?.stocks || []);

  // 2. Fetch watchlist (to check if favorited)
  const { data: watchlist } = useQuery('watchlist', () => watchlistService.get(), {
    refetchOnWindowFocus: false
  });
  const watchlistSymbols = new Set((watchlist || []).map(w => w.symbol));

  // 3. Watchlist mutations
  const addMutation = useMutation((symbol) => watchlistService.add(symbol), {
    onSuccess: (_, symbol) => {
      toast.success(`${symbol} added to watchlist`);
      qc.invalidateQueries('watchlist');
    },
    onError: () => toast.error('Failed to add to watchlist')
  });

  const removeMutation = useMutation((symbol) => watchlistService.remove(symbol), {
    onSuccess: (_, symbol) => {
      toast.success(`${symbol} removed from watchlist`);
      qc.invalidateQueries('watchlist');
    },
    onError: () => toast.error('Failed to remove from watchlist')
  });

  const handleToggleWatchlist = (e, symbol) => {
    e.preventDefault();
    e.stopPropagation();
    if (watchlistSymbols.has(symbol)) {
      removeMutation.mutate(symbol);
    } else {
      addMutation.mutate(symbol);
    }
  };

  // 4. WebSocket live updates
  useMarketTickerSocket(tick => {
    setLivePrices(prev => ({
      ...prev,
      [tick.symbol]: { price: tick.currentPrice, change: tick.change, pct: tick.changePercent },
    }));
  });

  const filtered = stocks
    .filter((s) =>
      (sector === 'All' || s.sector === sector) &&
      (search === '' || 
        s.symbol.toLowerCase().includes(search.toLowerCase()) || 
        (s.companyName || s.name || '').toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => b[sort] - a[sort]);

  return (
    <div className="space-y-8 animate-fadeIn font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">Market Terminal</h1>
        <p className="text-xs text-slate-400 mt-1">Live market positions updated every 5 seconds. Trade equities immediately.</p>
      </div>

      {/* Toolbar Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-slate-900/40 p-4 border border-slate-900 rounded-2xl">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search equities by symbol or name..."
            className="w-full bg-slate-950 border border-slate-900 rounded-xl pl-9 pr-4 py-2.5 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/10 transition-all"
          />
        </div>
        <select 
          value={sort} 
          onChange={e => setSort(e.target.value)}
          className="bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-slate-400 text-xs font-semibold focus:outline-none focus:border-emerald-500/80 transition-colors"
        >
          <option value="marketCap">Sort by Market Cap</option>
          <option value="changePercent">Sort by % Change</option>
          <option value="currentPrice">Sort by Share Price</option>
        </select>
      </div>

      {/* Sector Pills Navigation */}
      <div className="flex gap-2 flex-wrap pb-1">
        {SECTORS.map(s => {
          const isSelected = sector === s;
          return (
            <button 
              key={s} 
              onClick={() => setSector(s)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* Main Stock Table */}
      <div className="glass-card rounded-2xl border-slate-900 overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              <th className="py-4 px-6 w-16 text-center">Watch</th>
              <th className="py-4 px-6">Symbol</th>
              <th className="py-4 px-6">Name</th>
              <th className="py-4 px-6 text-right">Price</th>
              <th className="py-4 px-6 text-right">Daily Change</th>
              <th className="py-4 px-6 text-right">% Change</th>
              <th className="py-4 px-6 text-right">Market Cap</th>
              <th className="py-4 px-6 text-right">Volume</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/60 text-xs">
            {isStocksLoading ? (
              <tr>
                <td colSpan={8} className="py-12 px-6">
                  <Skeleton className="h-40 w-full animate-pulse" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-500 font-semibold">
                  No stocks match your query or sector.
                </td>
              </tr>
            ) : (
              filtered.map((s) => {
                const live = livePrices[s.symbol];
                const price = live?.price ?? s.currentPrice;
                const pct = live?.pct ?? s.changePercent;
                const chg = live?.change ?? s.change;
                const up = pct >= 0;
                const isWatched = watchlistSymbols.has(s.symbol);

                return (
                  <tr 
                    key={s.symbol} 
                    className="hover:bg-slate-900/30 transition duration-300 group cursor-pointer"
                    onClick={() => window.location.href = `/market/${s.symbol}`}
                  >
                    <td className="py-4 px-6 text-center" onClick={(e) => handleToggleWatchlist(e, s.symbol)}>
                      <button
                        className={`p-1.5 rounded-lg border border-transparent transition-colors hover:bg-slate-950 ${
                          isWatched ? 'text-yellow-400' : 'text-slate-600 hover:text-yellow-400'
                        }`}
                      >
                        <Star size={14} className={isWatched ? 'fill-current' : ''} />
                      </button>
                    </td>
                    <td className="py-4 px-6 font-extrabold text-sm text-slate-100">
                      <Link to={`/market/${s.symbol}`} className="text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                        {s.symbol}
                      </Link>
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-400 truncate max-w-[200px]">{s.companyName || s.name}</td>
                    <td className="py-4 px-6 text-right font-mono-numbers font-extrabold text-slate-200">
                      ${price?.toFixed(2)}
                    </td>
                    <td className={`py-4 px-6 text-right font-mono-numbers font-semibold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                      {up ? '+' : ''}{chg?.toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className={`inline-flex items-center gap-1 font-mono-numbers font-extrabold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                        {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {up ? '+' : ''}{pct?.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right text-slate-400 font-semibold">
                      ${(s.marketCap / 1e9).toFixed(1)}B
                    </td>
                    <td className="py-4 px-6 text-right text-slate-500 font-semibold font-mono-numbers">
                      {(s.volume / 1e6).toFixed(1)}M
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
