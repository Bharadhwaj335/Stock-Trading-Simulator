import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  BarChart3, RefreshCw, Award, PieChart, Activity, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { analyticsService } from '../services/api';
import StatCard from '../components/ui/StatCard';
import EquityChart from '../components/charts/EquityChart';
import PnLBarChart from '../components/charts/PnLBarChart';
import AllocationPie from '../components/charts/AllocationPie';
import WinRateGauge from '../components/charts/WinRateGauge';
import Skeleton from '../components/ui/Skeleton';

export default function AnalyticsPage() {
  const { data: analytics, isLoading, refetch } = useQuery(
    'analytics', 
    () => analyticsService.get(),
    { refetchOnWindowFocus: false }
  );

  const summary = analytics?.summary || {};
  const pnlByMonth = analytics?.pnlByMonth || [];
  const sectorExposure = analytics?.sectorExposure || [];
  const mostTraded = analytics?.mostTraded || [];
  const mostProfitable = analytics?.mostProfitable || [];
  const equityCurve = analytics?.equityCurve || [];

  const sellCount = summary.sellCount ?? summary.totalSells ?? 0;
  const winCount = summary.winCount ?? summary.wins ?? 0;
  const lossCount = summary.lossCount ?? 0;
  const totalPnL = summary.totalRealizedPnL ?? summary.totalPnL ?? 0;
  const avgPnL = summary.avgPnL ?? summary.avgWin ?? 0;
  const bestTrade = summary.bestTrade || null;
  const worstTrade = summary.worstTrade || null;
  const winRate = summary.winRate || 0;
  const profitFactor = summary.profitFactor ?? 1.5;

  const hasTrades = statsCount() > 0;

  function statsCount() {
    return (analytics?.summary?.totalTrades ?? 0);
  }

  // Calculate a Trader Score out of 100 based on winRate, profitFactor, and trades
  const calculateTraderScore = () => {
    const rateFactor = winRate * 0.4; // up to 40
    const profitScore = Math.min((profitFactor || 1) * 15, 40); // up to 40
    const volumeScore = Math.min(statsCount() * 0.5, 20); // up to 20
    return Math.min(Math.round(rateFactor + profitScore + volumeScore), 100);
  };

  const traderScore = calculateTraderScore();

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Performance Analytics</h1>
          <p className="text-xs text-slate-400 mt-1">Deep terminal inspection of closed trades, profitability weightings, and diversifications.</p>
        </div>
        <button 
          onClick={() => refetch()}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl transition text-xs font-bold"
        >
          <RefreshCw size={13} />
          Refresh Stats
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="lg:col-span-2 h-96 w-full animate-pulse" />
            <Skeleton className="h-96 w-full animate-pulse" />
          </div>
        </div>
      ) : !hasTrades ? (
        <div className="glass-card rounded-2xl border-slate-900 p-12 text-center max-w-2xl mx-auto shadow-2xl">
          <div className="inline-flex p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-emerald-400 mb-5 shadow-inner">
            <BarChart3 size={32} />
          </div>
          <h3 className="text-lg font-extrabold text-slate-100 mb-2">No Position Analytics Recorded</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
            Analytics metrics are automatically compiled once you execute and close trades (SELL orders). Purchase stock holdings inside the Market terminal, execute a sale, and inspect your pro performance graphs here.
          </p>
          <Link 
            to="/market" 
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs px-6 py-3 rounded-xl transition shadow-lg shadow-emerald-500/10 inline-flex items-center gap-1.5"
          >
            Open Market Terminal <ChevronRight size={13} />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              label="Win Rate Ratio" 
              value={`${winRate.toFixed(1)}%`} 
              subtext={`${winCount} wins / ${sellCount} sales`}
              icon={CheckCircle2}
              color={winRate >= 50 ? 'emerald' : 'amber'}
            />
            <StatCard 
              label="Realized Net P&L" 
              value={`${totalPnL >= 0 ? '+' : ''}$${totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtext="Sum of closed executions"
              icon={Activity}
              color={totalPnL >= 0 ? 'emerald' : 'red'}
            />
            <StatCard 
              label="Average Sale P&L" 
              value={`${avgPnL >= 0 ? '+' : ''}$${avgPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtext="Mean return per sell"
              icon={BarChart3}
              color={avgPnL >= 0 ? 'emerald' : 'red'}
            />
            <StatCard 
              label="Best Closed Profit" 
              value={bestTrade ? `+$${bestTrade.pnl?.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00'}
              subtext={bestTrade ? `Single sell of ${bestTrade.symbol}` : 'No profit yet'}
              icon={Award}
              color="emerald"
            />
          </div>

          {/* Performance Curves & Win Rate Gauge Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Equity performance curve */}
            <div className="lg:col-span-2 glass-card rounded-2xl border-slate-900 p-6 flex flex-col gap-4 shadow-xl">
              <div>
                <h2 className="text-sm font-bold text-slate-200">Equity Value Progression</h2>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Live account cash curve mapped over trade execution timestamps</p>
              </div>
              <div className="h-[220px]">
                <EquityChart data={equityCurve} />
              </div>
            </div>

            {/* Circular Win Rate Gauge & Trader Score */}
            <div className="glass-card rounded-2xl border-slate-900 p-6 flex flex-col items-center justify-between shadow-xl">
              <div className="w-full text-left">
                <h2 className="text-sm font-bold text-slate-200">Win/Loss Distribution</h2>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Aggregate profitability ratios</p>
              </div>

              <div className="my-2">
                <WinRateGauge winRate={winRate} />
              </div>

              {/* Trader Score custom visual block */}
              <div className="w-full bg-slate-950/50 border border-slate-900/60 p-4 rounded-xl text-center relative overflow-hidden backdrop-blur-sm shadow-inner">
                <div className="absolute top-0 right-0 w-12 h-12 bg-cyan-500/5 rounded-full filter blur-[15px] pointer-events-none" />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Trader Grade Score</span>
                <span className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent block mt-1 tracking-tight">
                  {traderScore} <span className="text-xs text-slate-400 font-bold">/ 100</span>
                </span>
                <span className="text-[8px] font-bold text-slate-400 block mt-1 uppercase tracking-wide">
                  {traderScore >= 80 ? '👑 Master Level' : traderScore >= 60 ? '⚡ Advanced Level' : '🌱 Novice Level'}
                </span>
              </div>
            </div>
          </div>

          {/* Monthly returns summary & Sector exposures donut */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly P&L Chart */}
            <div className="glass-card rounded-2xl border-slate-900 p-6 flex flex-col gap-4 shadow-xl">
              <div>
                <h2 className="text-sm font-bold text-slate-200">Monthly Returns Summary</h2>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Closed realized earnings aggregated by calendar months</p>
              </div>
              <div className="h-[220px]">
                <PnLBarChart data={pnlByMonth} />
              </div>
            </div>

            {/* Sector exposure donut */}
            <div className="glass-card rounded-2xl border-slate-900 p-6 flex flex-col gap-4 shadow-xl">
              <div>
                <h2 className="text-sm font-bold text-slate-200">Sector Exposure Allocation</h2>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Asset diversification weightings by sector classifications</p>
              </div>
              <div className="h-[220px] flex items-center justify-center">
                <AllocationPie data={sectorExposure} nameKey="sector" valueKey="value" />
              </div>
            </div>
          </div>

          {/* Most Active & Most Profitable lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most active stocks */}
            <div className="glass-card rounded-2xl border-slate-900 p-6 flex flex-col gap-4 shadow-xl">
              <div>
                <h2 className="text-sm font-bold text-slate-200">Top Volume Assets</h2>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Most actively executed stock positions by trade count</p>
              </div>

              <div className="space-y-1">
                {mostTraded.slice(0, 5).map((item, idx) => (
                  <div key={item.symbol} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-900/60 hover:border-slate-800 transition-all">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800/80 text-[10px] font-black text-slate-400 flex items-center justify-center font-mono-numbers">
                        {idx + 1}
                      </span>
                      <div>
                        <Link to={`/market/${item.symbol}`} className="text-xs font-bold text-slate-200 hover:text-emerald-400 transition-colors">
                          {item.symbol}
                        </Link>
                        <div className="text-[9px] text-slate-500 font-semibold mt-0.5">
                          Volume Value: ${item.volume?.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-300 bg-slate-900 border border-slate-800/80 px-2.5 py-1 rounded-lg">
                      {item.count} trades
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Most profitable stocks */}
            <div className="glass-card rounded-2xl border-slate-900 p-6 flex flex-col gap-4 shadow-xl">
              <div>
                <h2 className="text-sm font-bold text-slate-200">Most Profitable Holdings</h2>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Closed asset positions ranked by cumulative profit dollars</p>
              </div>

              <div className="space-y-1">
                {mostProfitable.length === 0 ? (
                  <p className="py-8 text-center text-slate-500 text-xs">No profits logged yet.</p>
                ) : (
                  mostProfitable.slice(0, 5).map((item, idx) => (
                    <div key={item.symbol} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-900/60 hover:border-slate-800 transition-all">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800/80 text-[10px] font-black text-slate-400 flex items-center justify-center font-mono-numbers">
                          {idx + 1}
                        </span>
                        <div>
                          <Link to={`/market/${item.symbol}`} className="text-xs font-bold text-slate-200 hover:text-emerald-400 transition-colors">
                            {item.symbol}
                          </Link>
                          <div className="text-[9px] text-slate-500 font-semibold mt-0.5">
                            Total Trades: {item.trades}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold font-mono-numbers text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        +${item.totalPnL?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
