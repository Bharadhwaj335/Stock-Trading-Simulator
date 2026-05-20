import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  BarChart3, PieChart, TrendingUp, TrendingDown, 
  Award, RefreshCw, BarChart2, ShieldAlert 
} from 'lucide-react';
import { analyticsService } from '../services/api';

const StatCard = ({ label, value, sub, type }) => {
  const isPos = type === 'success' || (typeof value === 'string' && value.startsWith('+'));
  const isNeg = type === 'danger' || (typeof value === 'string' && value.startsWith('-'));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <p className="text-slate-400 text-sm font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${
        isPos ? 'text-emerald-400' : isNeg ? 'text-red-400' : 'text-white'
      }`}>{value}</p>
      {sub && <p className="text-slate-400 text-xs mt-1.5 font-medium">{sub}</p>}
    </div>
  );
};

export default function AnalyticsPage() {
  const { data: analytics, isLoading, refetch } = useQuery(
    'analytics', 
    () => analyticsService.get().then(r => r.data),
    { refetchOnWindowFocus: false }
  );

  const summary = analytics?.summary || { totalSells: 0, wins: 0, winRate: 0, totalPnL: 0, avgPnL: 0, bestTrade: 0, worstTrade: 0 };
  const pnlByMonth = analytics?.pnlByMonth || [];
  const sectorExposure = analytics?.sectorExposure || [];
  const mostTraded = analytics?.mostTraded || [];

  const hasTrades = summary.totalSells > 0;
  const winRate = summary.winRate || 0;
  const isWinRateHigh = winRate >= 50;

  // Month names
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Performance Analytics</h1>
          <p className="text-slate-400 mt-1">Deep dive into your closed trades, win rate, and portfolio allocation.</p>
        </div>
        <button 
          onClick={() => refetch()}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg transition text-sm font-medium"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-900/50 border border-slate-800 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-slate-900/50 border border-slate-800 rounded-xl"></div>
            <div className="h-96 bg-slate-900/50 border border-slate-800 rounded-xl"></div>
          </div>
        </div>
      ) : !hasTrades ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <div className="inline-flex p-4 rounded-full bg-slate-800 text-slate-400 mb-4">
            <BarChart3 size={32} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Performance Metrics Available</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
            Analytics are computed based on your closed trades (SELL orders). Once you sell some holdings, you'll see a complete breakdown of your metrics, win rate, and sector allocations.
          </p>
          <Link 
            to="/market" 
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-lg transition inline-flex items-center gap-1.5"
          >
            Explore Market
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              label="Win Rate" 
              value={`${winRate.toFixed(1)}%`} 
              sub={`${summary.wins} wins out of ${summary.totalSells} trades`}
              type={isWinRateHigh ? 'success' : 'danger'}
            />
            <StatCard 
              label="Total Realized P&L" 
              value={`${summary.totalPnL >= 0 ? '+' : ''}$${summary.totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              sub="Sum of all closed trades"
              type={summary.totalPnL >= 0 ? 'success' : 'danger'}
            />
            <StatCard 
              label="Average Trade Return" 
              value={`${summary.avgPnL >= 0 ? '+' : ''}$${summary.avgPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              sub="Average gain/loss per sale"
              type={summary.avgPnL >= 0 ? 'success' : 'danger'}
            />
            <StatCard 
              label="Best Trade" 
              value={`+$${(summary.bestTrade || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              sub="Your highest single trade profit"
              type="success"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sector Diversification */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <PieChart size={18} className="text-emerald-400" />
                  <h2 className="font-semibold text-white">Portfolio Diversification</h2>
                </div>
                <p className="text-xs text-slate-400 mb-6">
                  Recommended exposure is less than 30% per sector to minimize market correlation risks.
                </p>
                <div className="space-y-4">
                  {sectorExposure.length === 0 ? (
                    <p className="text-sm text-slate-500">No active holdings exposure.</p>
                  ) : (
                    sectorExposure.map((sectorObj) => {
                      const isHighRisk = sectorObj.percent > 30;
                      return (
                        <div key={sectorObj.sector} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-300">{sectorObj.sector}</span>
                            <span className={isHighRisk ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                              {sectorObj.percent.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                isHighRisk ? 'bg-amber-500' : 'bg-emerald-500'
                              }`} 
                              style={{ width: `${Math.min(100, sectorObj.percent)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>Allocation Value</span>
                            <span>${sectorObj.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-start gap-2.5 text-xs text-slate-400 bg-slate-950/40 p-3 rounded-lg">
                <Award size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Sector breakdown is updated automatically based on stock prices.</span>
              </div>
            </div>

            {/* Performance by Month */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart2 size={18} className="text-emerald-400" />
                <h2 className="font-semibold text-white">Monthly Returns Summary</h2>
              </div>
              {pnlByMonth.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
                  No monthly data recorded yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {pnlByMonth.slice(-6).map((m, idx) => {
                    const isPos = m.pnl >= 0;
                    return (
                      <div key={idx} className="flex items-center justify-between py-2.5 border-b border-slate-800/60 last:border-b-0 hover:bg-slate-800/10 px-2 rounded-lg transition -mx-2">
                        <div>
                          <div className="font-semibold text-white">{monthNames[m.month - 1] || `Month ${m.month}`} {m.year}</div>
                          <div className="text-slate-400 text-xs mt-0.5">{m.trades} transaction{m.trades > 1 ? 's' : ''}</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isPos ? '+' : ''}${m.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Most Traded Assets */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 size={18} className="text-emerald-400" />
                <h2 className="font-semibold text-white">Most Active Assets</h2>
              </div>
              {mostTraded.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
                  No activity recorded.
                </div>
              ) : (
                <div className="space-y-4">
                  {mostTraded.map((item, idx) => (
                    <div key={item._id} className="flex items-center justify-between py-2.5 border-b border-slate-800/60 last:border-b-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-white border border-slate-700">
                          {idx + 1}
                        </div>
                        <div>
                          <Link to={`/market/${item._id}`} className="font-semibold text-white hover:text-emerald-400 transition">
                            {item._id}
                          </Link>
                          <div className="text-slate-400 text-xs mt-0.5">Volume: ${item.volume.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="bg-slate-800 border border-slate-700 text-slate-300 text-xs px-2.5 py-1 rounded-full font-bold">
                          {item.count} trade{item.count > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
