import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, DollarSign, Briefcase, ArrowRight } from 'lucide-react';
import { portfolioService, stockService } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useMarketTickerSocket } from '../hooks/useSocket';
import { useState } from 'react';

const StatCard = ({ label, value, sub, positive }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
    <p className="text-slate-400 text-sm">{label}</p>
    <p className="text-2xl font-bold text-white mt-1">{value}</p>
    {sub && (
      <p className={`text-sm mt-1 ${positive ? 'text-emerald-400' : positive === false ? 'text-red-400' : 'text-slate-400'}`}>
        {sub}
      </p>
    )}
  </div>
);

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const [livePrices, setLivePrices] = useState({});

  const { data: portfolio } = useQuery('portfolio', () => portfolioService.get().then(r => r.data));
  const { data: stocks }    = useQuery('stocks', () => stockService.getAll().then(r => r.data.data));

  useMarketTickerSocket(tick => {
    setLivePrices(prev => ({ ...prev, [tick.symbol]: tick.currentPrice }));
  });

  const summary = portfolio?.summary;
  const topHoldings = (portfolio?.holdings || []).slice(0, 5);
  const topMovers   = (stocks || [])
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Good morning, {user?.username} 👋</h1>
        <p className="text-slate-400 mt-1">Here's your portfolio at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Cash Balance"     value={`$${(summary?.walletBalance || 0).toLocaleString()}`} />
        <StatCard label="Portfolio Value"  value={`$${(summary?.portfolioValue || 0).toLocaleString()}`} />
        <StatCard label="Net Worth"        value={`$${(summary?.netWorth || 0).toLocaleString()}`} />
        <StatCard
          label="Total P&L"
          value={`${summary?.totalPnL >= 0 ? '+' : ''}$${(summary?.totalPnL || 0).toLocaleString()}`}
          sub={`${(summary?.totalPnLPercent || 0).toFixed(2)}%`}
          positive={(summary?.totalPnL || 0) >= 0}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top holdings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Your Holdings</h2>
            <Link to="/portfolio" className="text-emerald-400 text-sm flex items-center gap-1 hover:text-emerald-300">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {topHoldings.length === 0 && (
              <p className="text-slate-500 text-sm">No holdings yet. <Link to="/market" className="text-emerald-400">Browse market</Link></p>
            )}
            {topHoldings.map((h) => {
              const live = livePrices[h.symbol];
              const val  = live ? live * h.quantity : h.currentValue;
              return (
                <Link to={`/market/${h.symbol}`} key={h.symbol}
                  className="flex items-center justify-between py-2 hover:bg-slate-800 px-2 rounded-lg -mx-2 transition">
                  <div>
                    <span className="font-medium text-white">{h.symbol}</span>
                    <span className="text-slate-400 text-sm ml-2">{h.quantity} shares</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">${val.toLocaleString()}</div>
                    <div className={`text-xs ${h.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {h.pnl >= 0 ? '+' : ''}{h.pnlPercent.toFixed(2)}%
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Top movers */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Top Movers</h2>
            <Link to="/market" className="text-emerald-400 text-sm flex items-center gap-1 hover:text-emerald-300">
              Market <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {topMovers.map((s) => {
              const price = livePrices[s.symbol] || s.currentPrice;
              const up    = s.changePercent >= 0;
              return (
                <Link to={`/market/${s.symbol}`} key={s.symbol}
                  className="flex items-center justify-between py-2 hover:bg-slate-800 px-2 rounded-lg -mx-2 transition">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${up ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                      {up ? <TrendingUp size={14} className="text-emerald-400" /> : <TrendingDown size={14} className="text-red-400" />}
                    </div>
                    <div>
                      <div className="font-medium text-white">{s.symbol}</div>
                      <div className="text-slate-400 text-xs">{s.name.substring(0, 22)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white">${price.toFixed(2)}</div>
                    <div className={`text-xs ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                      {up ? '+' : ''}{s.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
