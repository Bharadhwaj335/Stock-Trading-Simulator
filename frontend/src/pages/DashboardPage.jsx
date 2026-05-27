import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, DollarSign, Briefcase,
  ArrowRight, Shield, Award, Calendar
} from 'lucide-react';
import { portfolioService, stockService, analyticsService, newsService, tradeService } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useMarketTickerSocket } from '../hooks/useSocket';
import StatCard from '../components/ui/StatCard';
import EquityChart from '../components/charts/EquityChart';
import NewsCard from '../components/ui/NewsCard';
import Skeleton from '../components/ui/Skeleton';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [livePrices, setLivePrices] = useState({});

  // 1. Fetch portfolio and market data
  const { data: portfolio, isLoading: portfolioLoading } = useQuery('portfolio', () => portfolioService.get(), {
    refetchInterval: 15000 // Refetch every 15s to keep sync
  });
  
  const { data: stocksData, isLoading: stocksLoading } = useQuery('stocks', () => stockService.getAll().then(r => r.data.data));
  const stocks = Array.isArray(stocksData) ? stocksData : (stocksData?.stocks || []);

  // 2. Fetch analytics (for Equity Curve)
  const { data: analytics, isLoading: analyticsLoading } = useQuery('analytics', () => analyticsService.get());

  // 3. Fetch general market news
  const { data: news, isLoading: newsLoading } = useQuery('market-news', () => newsService.getMarket());

  // 4. Fetch recent transactions
  const { data: recentTradesResponse, isLoading: tradesLoading } = useQuery('recent-trades', () => tradeService.getHistory({ limit: 5 }));
  const recentTrades = recentTradesResponse?.data?.trades || [];

  // WebSocket Live Tickers
  useMarketTickerSocket((tick) => {
    setLivePrices((prev) => ({ ...prev, [tick.symbol]: tick.currentPrice }));
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const summary = portfolio?.summary;
  const topHoldings = (portfolio?.holdings || []).slice(0, 5);
  const topMovers = [...stocks]
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 6);

  const totalPnL = summary?.totalPnL ?? 0;
  const totalPnLPercent = summary?.totalPnLPercent ?? 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            {getGreeting()}, {user?.username} 👋
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Practice mode is active. Here is your portfolio terminal overview.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-900/40 border border-slate-900 px-3.5 py-2 rounded-full self-start md:self-auto select-none">
          <Calendar size={13} className="text-emerald-500" />
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* KPI StatCards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {portfolioLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-[96px] w-full" />
          ))
        ) : (
          <>
            <StatCard
              label="Cash Balance"
              value={`$${(summary?.walletBalance ?? 30000).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              subtext="Uninvested Capital"
              icon={DollarSign}
              color="blue"
            />
            <StatCard
              label="Holdings Value"
              value={`$${(summary?.portfolioValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              subtext="Active Equity Exposure"
              icon={Briefcase}
              color="cyan"
            />
            <StatCard
              label="Net Worth"
              value={`$${(summary?.netWorth ?? 30000).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              subtext="Combined Capital Balance"
              icon={Shield}
              color="amber"
            />
            <StatCard
              label="Total P&L"
              value={`${totalPnL >= 0 ? '+' : ''}$${totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              subtext="Lifetime Realized & Open P&L"
              icon={Award}
              trend={Number(totalPnLPercent.toFixed(2))}
              color={totalPnL >= 0 ? 'emerald' : 'red'}
            />
          </>
        )}
      </div>

      {/* Second Row: Equity growth chart */}
      <div className="glass-card rounded-2xl border-slate-900 p-6 flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-200">Portfolio Performance</h2>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Account cash trajectory across past executions</p>
          </div>
          <div className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
            Real-Time Feed
          </div>
        </div>
        
        {analyticsLoading ? (
          <Skeleton className="h-[220px] w-full" />
        ) : (
          <div className="h-[220px]">
            <EquityChart data={analytics?.equityCurve} />
          </div>
        )}
      </div>

      {/* Third Row: 2-column grid of holdings and movers */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Your Holdings list */}
        <div className="glass-card rounded-2xl border-slate-900 p-6 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-200">Your Active Positions</h2>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Open holdings weighted by current prices</p>
            </div>
            <Link to="/portfolio" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
              Full Portfolio <ArrowRight size={12} />
            </Link>
          </div>

          <div className="space-y-1">
            {portfolioLoading ? (
              Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : topHoldings.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs font-medium flex flex-col items-center gap-2">
                <span>💼 No holdings currently held.</span>
                <Link to="/market" className="text-emerald-400 font-bold hover:underline">
                  Browse Stocks to Trade →
                </Link>
              </div>
            ) : (
              topHoldings.map((h) => {
                const live = livePrices[h.symbol];
                const finalPrice = live ?? h.currentPrice ?? h.avgBuyPrice;
                const val = finalPrice * h.qty;
                return (
                  <Link
                    to={`/market/${h.symbol}`}
                    key={h.symbol}
                    className="flex items-center justify-between p-3 hover:bg-slate-900/35 border border-transparent hover:border-slate-800 rounded-xl transition-all group"
                  >
                    <div>
                      <div className="font-extrabold text-sm text-slate-200 group-hover:text-emerald-400 transition-colors">
                        {h.symbol}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                        {h.qty} shares · Avg buy price ${h.avgBuyPrice?.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-200 font-mono-numbers">
                        ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className={`text-[10px] font-bold font-mono-numbers mt-0.5 ${h.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {h.pnl >= 0 ? '+' : ''}{h.pnlPercent?.toFixed(2)}%
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Top Movers list */}
        <div className="glass-card rounded-2xl border-slate-900 p-6 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-200">Active Market Movers</h2>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Top price percent shifts on the day</p>
            </div>
            <Link to="/market" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
              Market Terminals <ArrowRight size={12} />
            </Link>
          </div>

          <div className="space-y-1">
            {stocksLoading ? (
              Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : (
              topMovers.map((s) => {
                const price = livePrices[s.symbol] || s.currentPrice;
                const isUp = s.changePercent >= 0;
                const displayName = (s.name || s.symbol || 'Unknown').slice(0, 26);
                return (
                  <Link
                    to={`/market/${s.symbol}`}
                    key={s.symbol}
                    className="flex items-center justify-between p-3 hover:bg-slate-900/35 border border-transparent hover:border-slate-800 rounded-xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-slate-200 group-hover:text-emerald-400 transition-colors">
                          {s.symbol}
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold mt-0.5 truncate max-w-[200px]">
                          {displayName}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-200 font-mono-numbers">
                        ${price?.toFixed(2)}
                      </div>
                      <div className={`text-[10px] font-bold font-mono-numbers mt-0.5 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isUp ? '+' : ''}{s.changePercent?.toFixed(2)}%
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Fourth Row: News feed and recent activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Live News feed */}
        <div className="glass-card rounded-2xl border-slate-900 p-6 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-200">Featured Market News</h2>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Top economic and company updates</p>
            </div>
            <Link to="/news" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
              Full Feed <ArrowRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {newsLoading ? (
              Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            ) : !news || news.length === 0 ? (
              <p className="py-8 text-center text-slate-500 text-xs">No recent news available.</p>
            ) : (
              news.slice(0, 3).map((item) => (
                <NewsCard key={item.id} {...item} />
              ))
            )}
          </div>
        </div>

        {/* Recent user transactions */}
        <div className="glass-card rounded-2xl border-slate-900 p-6 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-200">Recent Terminal Activity</h2>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Your last 5 simulated executions</p>
            </div>
            <Link to="/portfolio?tab=transactions" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
              History <ArrowRight size={12} />
            </Link>
          </div>

          <div className="space-y-3">
            {tradesLoading ? (
              Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : recentTrades.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs font-medium">
                🎯 No transactions executed yet. Ready to trade!
              </div>
            ) : (
              recentTrades.map((t) => {
                const isBuy = t.type === 'buy';
                return (
                  <div key={t._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-900/60 hover:border-slate-800 transition-all">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                        isBuy ? 'text-cyan-400 bg-cyan-500/10' : 'text-red-400 bg-red-500/10'
                      }`}>
                        {t.type}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-slate-200">{t.symbol}</div>
                        <div className="text-[9px] text-slate-500 font-semibold mt-0.5">
                          {t.qty} shares @ ${t.priceAtTrade?.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-200 font-mono-numbers">
                        ${t.totalValue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {!isBuy && t.pnl !== null && (
                        <div className={`text-[9px] font-bold font-mono-numbers mt-0.5 ${t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          P&L: {t.pnl >= 0 ? '+' : ''}${t.pnl?.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
