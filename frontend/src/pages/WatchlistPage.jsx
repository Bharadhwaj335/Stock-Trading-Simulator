import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import { Star, TrendingUp, TrendingDown, StarOff, Grid, List, ChevronRight } from 'lucide-react';
import { watchlistService } from '../services/api';
import { useMarketTickerSocket } from '../hooks/useSocket';
import Skeleton from '../components/ui/Skeleton';
import toast from 'react-hot-toast';

export default function WatchlistPage() {
  const qc = useQueryClient();
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [livePrices, setLivePrices] = useState({});

  // 1. Fetch watchlist items
  const { data: watchlist, isLoading, refetch } = useQuery('watchlist', () => watchlistService.get(), {
    refetchOnWindowFocus: false
  });

  // 2. Unwatch mutation
  const unwatchMutation = useMutation(
    (symbol) => watchlistService.remove(symbol),
    {
      onSuccess: (_, symbol) => {
        toast.success(`${symbol} removed from watchlist`);
        qc.invalidateQueries('watchlist');
      },
      onError: () => {
        toast.error('Failed to remove stock from watchlist');
      }
    }
  );

  // 3. WebSocket live ticker updates
  useMarketTickerSocket((tick) => {
    setLivePrices((prev) => ({
      ...prev,
      [tick.symbol]: { price: tick.currentPrice, changePercent: tick.changePercent }
    }));
  });

  const count = watchlist?.length || 0;

  return (
    <div className="space-y-8 animate-fadeIn font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
            <Star className="text-yellow-400 fill-yellow-400 w-6 h-6 flex-shrink-0" />
            My Watchlist
            {count > 0 && (
              <span className="text-[10px] bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/15 font-extrabold uppercase ml-1">
                {count} {count === 1 ? 'Asset' : 'Assets'}
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1">Keep track of your favorite symbols and check their live ticking performances.</p>
        </div>

        {/* View toggler */}
        {count > 0 && (
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Grid size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <List size={14} />
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-44 w-full animate-pulse" />)}
        </div>
      ) : count === 0 ? (
        <div className="glass-card rounded-2xl border-slate-900 p-12 text-center max-w-2xl mx-auto shadow-2xl">
          <div className="inline-flex p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-yellow-400 mb-5 shadow-inner">
            <Star size={32} />
          </div>
          <h3 className="text-lg font-extrabold text-slate-100 mb-2">Watchlist is Empty</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6 leading-relaxed">
            Quickly monitor specific market listings by checking their stars. Search for assets inside the Market terminal to add them here.
          </p>
          <Link 
            to="/market" 
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs px-6 py-3 rounded-xl transition shadow-lg shadow-emerald-500/10 inline-flex items-center gap-1.5"
          >
            Browse Market Listings <ChevronRight size={13} />
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {watchlist.map((s) => {
            const live = livePrices[s.symbol];
            const finalPrice = live?.price ?? s.currentPrice ?? s.previousClose;
            const finalChange = live?.changePercent ?? s.changePercent ?? 0;
            const isUp = finalChange >= 0;
            const displayName = s.name || s.symbol;

            return (
              <div 
                key={s.symbol}
                className="glass-card rounded-2xl border-slate-900 p-5 flex flex-col justify-between shadow-xl relative group hover:border-slate-800/80 transition-all duration-300"
              >
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div>
                    <Link to={`/market/${s.symbol}`} className="font-extrabold text-lg text-slate-100 hover:text-emerald-400 transition-colors">
                      {s.symbol}
                    </Link>
                    <div className="text-[10px] text-slate-400 font-semibold truncate max-w-[170px] mt-0.5">
                      {displayName}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => unwatchMutation.mutate(s.symbol)}
                    disabled={unwatchMutation.isLoading}
                    className="text-yellow-400 hover:text-slate-500 p-1.5 hover:bg-slate-900 rounded-lg transition-colors border border-transparent hover:border-slate-800"
                  >
                    <Star size={16} className="fill-current" />
                  </button>
                </div>

                {/* Price indicators */}
                <div className="flex items-end justify-between mt-8">
                  <div>
                    <div className="font-mono-numbers font-black text-2xl text-slate-100 tracking-tight">
                      ${finalPrice?.toFixed(2)}
                    </div>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">Live Price</span>
                  </div>

                  <div className={`flex items-center gap-1 font-mono-numbers font-bold text-xs px-2 py-0.5 rounded-lg ${
                    isUp ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                  }`}>
                    {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    <span>{isUp ? '+' : ''}{finalChange?.toFixed(2)}%</span>
                  </div>
                </div>

                {/* Bottom detail */}
                <div className="flex items-center justify-between border-t border-slate-900/50 mt-4 pt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Sector: {s.sector || 'N/A'}</span>
                  <Link to={`/market/${s.symbol}`} className="text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    Terminal <ChevronRight size={11} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="glass-card rounded-2xl border-slate-900 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  <th className="py-4 px-6">Symbol</th>
                  <th className="py-4 px-6">Company Name</th>
                  <th className="py-4 px-6">Sector</th>
                  <th className="py-4 px-6 text-right">Ticking Price</th>
                  <th className="py-4 px-6 text-right">Shift %</th>
                  <th className="py-4 px-6 text-center">Unstar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-xs">
                {watchlist.map((s) => {
                  const live = livePrices[s.symbol];
                  const finalPrice = live?.price ?? s.currentPrice ?? s.previousClose;
                  const finalChange = live?.changePercent ?? s.changePercent ?? 0;
                  const isUp = finalChange >= 0;

                  return (
                    <tr key={s.symbol} className="hover:bg-slate-900/30 transition duration-300">
                      <td className="py-4 px-6 font-extrabold text-sm text-slate-100">
                        <Link to={`/market/${s.symbol}`} className="hover:text-emerald-400 transition-colors">
                          {s.symbol}
                        </Link>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-400">{s.name || s.symbol}</td>
                      <td className="py-4 px-6 font-bold text-slate-500">{s.sector || 'N/A'}</td>
                      <td className="py-4 px-6 text-right font-mono-numbers font-extrabold text-slate-200">
                        ${finalPrice?.toFixed(2)}
                      </td>
                      <td className={`py-4 px-6 text-right font-mono-numbers font-extrabold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isUp ? '+' : ''}{finalChange?.toFixed(2)}%
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => unwatchMutation.mutate(s.symbol)}
                          disabled={unwatchMutation.isLoading}
                          className="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-slate-950 transition-colors"
                        >
                          <StarOff size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
