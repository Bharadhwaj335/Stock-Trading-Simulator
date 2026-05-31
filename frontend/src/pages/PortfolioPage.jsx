import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, TrendingDown, DollarSign, Briefcase, 
  Clock, ArrowUpRight, ArrowDownLeft, RefreshCw,
  PieChart, FileText, CheckCircle2, AlertTriangle, ArrowRight,
  Download
} from 'lucide-react';
import { portfolioService, tradeService, analyticsService } from '../services/api';
import { useMarketTickerSocket } from '../hooks/useSocket';
import StatCard from '../components/ui/StatCard';
import AllocationPie from '../components/charts/AllocationPie';
import Skeleton from '../components/ui/Skeleton';
import toast from 'react-hot-toast';

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState('holdings'); // 'holdings', 'history', 'allocation'
  const [livePrices, setLivePrices] = useState({});

  // 1. Fetch portfolio open positions
  const { 
    data: portfolio, 
    isLoading: portfolioLoading, 
    refetch: refetchPortfolio 
  } = useQuery('portfolio', () => portfolioService.get(), {
    refetchOnWindowFocus: false,
  });

  // 2. Fetch full trade history
  const { 
    data: tradesData, 
    isLoading: tradesLoading,
    refetch: refetchTrades
  } = useQuery('tradeHistory', () => tradeService.getHistory({ limit: 100 }), {
    refetchOnWindowFocus: false,
  });

  // 3. Fetch analytics (for sector allocation)
  const { data: analytics } = useQuery('analytics', () => analyticsService.get());

  // WebSocket live ticker updates
  useMarketTickerSocket(tick => {
    setLivePrices(prev => ({ ...prev, [tick.symbol]: tick.currentPrice }));
  });

  const handleRefresh = () => {
    refetchPortfolio();
    refetchTrades();
  };

  const summary = portfolio?.summary;
  const holdings = portfolio?.holdings || [];
  let trades = [];
  if (tradesData) {
    if (Array.isArray(tradesData.trades)) {
      trades = tradesData.trades;
    } else if (Array.isArray(tradesData.data?.trades)) {
      trades = tradesData.data.trades;
    } else if (Array.isArray(tradesData.data)) {
      trades = tradesData.data;
    } else if (Array.isArray(tradesData)) {
      trades = tradesData;
    }
  }

  // 4. Enrich holdings with live WebSocket tick valuations
  let livePortfolioValue = 0;
  let totalCost = 0;

  const enrichedHoldings = holdings.map(h => {
    const currentPrice = livePrices[h.symbol] || h.currentPrice || h.avgBuyPrice || 0;
    const qty = h.qty || h.quantity || 0;
    const currentValue = currentPrice * qty;
    const pnl = currentValue - h.totalInvested;
    const pnlPercent = h.totalInvested > 0 ? (pnl / h.totalInvested) * 100 : 0;
    
    livePortfolioValue += currentValue;
    totalCost += h.totalInvested;

    return {
      ...h,
      qty,
      quantity: qty,
      currentPrice,
      currentValue,
      pnl,
      pnlPercent
    };
  });

  const liveWalletBalance = summary?.walletBalance || 0;
  const liveNetWorth = liveWalletBalance + livePortfolioValue;
  const liveTotalPnL = livePortfolioValue - totalCost;
  const liveTotalPnLPercent = totalCost > 0 ? (liveTotalPnL / totalCost) * 100 : 0;

  const isPnLPositive = liveTotalPnL >= 0;

  // Realized P&L from transaction logs
  const realizedPnL = trades
    .filter(t => t.type === 'sell' && t.pnl !== null)
    .reduce((sum, t) => sum + (t.pnl || 0), 0);

  // Best & Worst positions held
  const sortedPnLHoldings = [...enrichedHoldings].sort((a, b) => b.pnl - a.pnl);
  const bestHolding = sortedPnLHoldings[0] || null;
  const worstHolding = sortedPnLHoldings[sortedPnLHoldings.length - 1] || null;

  // Export CSV handler
  const handleExportCSV = () => {
    if (trades.length === 0) {
      toast.error('No transactions available to export');
      return;
    }
    const headers = ['Date', 'Type', 'Symbol', 'Shares', 'Execution Price', 'Total Value', 'Realized PnL'];
    const rows = trades.map(t => [
      new Date(t.executedAt || t.createdAt).toLocaleString(),
      t.type?.toUpperCase(),
      t.symbol,
      t.qty || t.quantity,
      t.priceAtTrade || t.price,
      t.totalValue || t.total,
      t.pnl ?? '0.00'
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stocksim_transactions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Transaction history downloaded as CSV!');
  };

  return (
    <div className="space-y-8 animate-fadeIn font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Portfolio Manager</h1>
          <p className="text-xs text-slate-400 mt-1 font-semibold">Inspect position weights, monitor open returns, and analyze execution histories.</p>
        </div>
        <button 
          onClick={handleRefresh}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl transition text-xs font-bold self-start sm:self-auto"
        >
          <RefreshCw size={13} />
          Refresh Positions
        </button>
      </div>

      {/* KPI Stats widgets */}
      {portfolioLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            label="Net Worth Value" 
            value={`$${liveNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            subtext="Combined account balance"
            icon={Briefcase}
            color="amber"
          />
          <StatCard 
            label="Cash Balance" 
            value={`$${liveWalletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            subtext="Capital ready to trade"
            icon={DollarSign}
            color="blue"
          />
          <StatCard 
            label="Holdings Valuation" 
            value={`$${livePortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            subtext="Active stock exposure"
            icon={TrendingUp}
            color="cyan"
          />
          <StatCard 
            label="Open Position P&L" 
            value={`${isPnLPositive ? '+' : ''}$${liveTotalPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            subtext="Current open positions return"
            trend={Number(liveTotalPnLPercent.toFixed(2))}
            icon={isPnLPositive ? TrendingUp : TrendingDown}
            color={isPnLPositive ? 'emerald' : 'red'}
          />
        </div>
      )}

      {/* Realized/Unrealized Summary Highlights Banner */}
      {!portfolioLoading && holdings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Realized P&L */}
          <div className="glass-card rounded-2xl border-slate-900/60 p-4 bg-slate-900/10 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xl">💰</span>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Realized Net Returns</span>
                <span className={`text-xs font-mono-numbers font-extrabold mt-0.5 block ${realizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {realizedPnL >= 0 ? '+' : ''}${realizedPnL?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Best position */}
          {bestHolding && (
            <div className="glass-card rounded-2xl border-emerald-500/10 p-4 bg-emerald-500/5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl text-emerald-400">🔥</span>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Top Profit Holding</span>
                  <span className="text-xs font-extrabold text-slate-200 mt-0.5 block truncate max-w-[160px]">
                    {bestHolding.symbol} ({bestHolding.pnlPercent >= 0 ? '+' : ''}{bestHolding.pnlPercent?.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Worst position */}
          {worstHolding && (
            <div className="glass-card rounded-2xl border-red-500/10 p-4 bg-red-500/5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl text-red-400">⚠️</span>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Lowest Return Holding</span>
                  <span className="text-xs font-extrabold text-slate-200 mt-0.5 block truncate max-w-[160px]">
                    {worstHolding.symbol} ({worstHolding.pnlPercent >= 0 ? '+' : ''}{worstHolding.pnlPercent?.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-900/60 pb-px">
        {[
          { id: 'holdings', label: 'Active Positions', icon: Briefcase },
          { id: 'allocation', label: 'Asset Allocation', icon: PieChart },
          { id: 'history', label: 'Transaction Logs', icon: Clock }
        ].map(t => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-6 py-3.5 border-b-2 font-bold text-xs transition-colors -mb-px ${
                isActive
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">
        {/* TAB 1: Positions list */}
        {activeTab === 'holdings' && (
          <div className="glass-card rounded-2xl border-slate-900 overflow-hidden shadow-xl">
            {portfolioLoading ? (
              <div className="p-12 text-center">
                <Skeleton className="h-44 w-full animate-pulse" />
              </div>
            ) : enrichedHoldings.length === 0 ? (
              <div className="p-12 text-center max-w-sm mx-auto flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                  💼
                </div>
                <h3 className="font-extrabold text-slate-100 text-sm">No Holdings Found</h3>
                <p className="text-xs text-slate-500 leading-normal font-semibold">
                  You haven't bought any stock positions yet. Open the Market terminal to make your first trade execution.
                </p>
                <Link to="/market" className="bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold text-xs px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/10">
                  Open Market terminal
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      <th className="py-4 px-6">Equities</th>
                      <th className="py-4 px-6 text-right">Qty Held</th>
                      <th className="py-4 px-6 text-right">Avg Cost Basis</th>
                      <th className="py-4 px-6 text-right">Total Invested</th>
                      <th className="py-4 px-6 text-right">Live Price</th>
                      <th className="py-4 px-6 text-right">Current Value</th>
                      <th className="py-4 px-6 text-right">Lifetime Profit</th>
                      <th className="py-4 px-6 text-center">Trade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60 text-xs">
                    {enrichedHoldings.map((h) => {
                      const pos = h.pnl >= 0;
                      return (
                        <tr key={h.symbol} className="hover:bg-slate-900/30 transition duration-300">
                          <td className="py-4 px-6 font-extrabold text-slate-200">
                            <Link to={`/market/${h.symbol}`} className="hover:text-emerald-400 transition-colors">
                              {h.symbol}
                            </Link>
                          </td>
                          <td className="py-4 px-6 text-right text-slate-300 font-semibold font-mono-numbers">{h.qty}</td>
                          <td className="py-4 px-6 text-right text-slate-400 font-mono-numbers font-medium">
                            ${h.avgBuyPrice?.toFixed(2)}
                          </td>
                          <td className="py-4 px-6 text-right text-slate-400 font-mono-numbers font-medium">
                            ${h.totalInvested?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6 text-right text-slate-300 font-mono-numbers font-semibold">
                            ${h.currentPrice?.toFixed(2)}
                          </td>
                          <td className="py-4 px-6 text-right text-slate-200 font-mono-numbers font-extrabold">
                            ${h.currentValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`py-4 px-6 text-right font-mono-numbers font-extrabold ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                            <div>{pos ? '+' : ''}${h.pnl?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                            <div className="text-[10px] font-semibold">{pos ? '+' : ''}{h.pnlPercent?.toFixed(2)}%</div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <Link 
                              to={`/market/${h.symbol}`}
                              className="text-emerald-400 hover:text-slate-950 hover:bg-emerald-500 bg-slate-950 border border-slate-900 hover:border-transparent px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all"
                            >
                              TRADE
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Asset Allocation */}
        {activeTab === 'allocation' && (
          <div className="glass-card rounded-2xl border-slate-900 p-6 shadow-xl">
            <h2 className="text-sm font-bold text-slate-200 mb-1">Portfolio Weight Analysis</h2>
            <p className="text-[10px] text-slate-500 font-semibold mb-8">Asset weightings based on sector exposure limits</p>
            
            <div className="max-w-xl mx-auto h-[260px] flex items-center justify-center">
              <AllocationPie data={analytics?.sectorExposure} nameKey="sector" valueKey="value" />
            </div>
          </div>
        )}

        {/* TAB 3: Transaction logs */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* Export Toolbar */}
            {trades.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700/60 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition shadow"
                >
                  <Download size={13} className="text-emerald-400" />
                  <span>Export CSV</span>
                </button>
              </div>
            )}

            <div className="glass-card rounded-2xl border-slate-900 overflow-hidden shadow-xl">
              {tradesLoading ? (
                <div className="p-12 text-center">
                  <Skeleton className="h-44 w-full animate-pulse" />
                </div>
              ) : trades.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs font-semibold">
                  No transaction activity found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                        <th className="py-4 px-6">Timestamp</th>
                        <th className="py-4 px-6">Order Type</th>
                        <th className="py-4 px-6">Symbol</th>
                        <th className="py-4 px-6 text-right">Shares</th>
                        <th className="py-4 px-6 text-right">Execution Price</th>
                        <th className="py-4 px-6 text-right">Order Value</th>
                        <th className="py-4 px-6 text-right">Realized Return</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60 text-xs">
                      {trades.map((t) => {
                        const isBuy = t.type === 'buy';
                        const hasPnL = t.pnl !== null;
                        const isPnLPos = (t.pnl || 0) >= 0;
                        const dateObj = new Date(t.executedAt || t.createdAt);
                        const formattedTime = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                        return (
                          <tr key={t._id} className="hover:bg-slate-900/30 transition duration-300">
                            <td className="py-4 px-6 text-slate-500 font-bold uppercase tracking-wide">
                              {formattedTime}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                                isBuy ? 'text-cyan-400 bg-cyan-500/10' : 'text-red-400 bg-red-500/10'
                              }`}>
                                {isBuy ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                                {t.type}
                              </span>
                            </td>
                            <td className="py-4 px-6 font-extrabold text-slate-200">
                              <Link to={`/market/${t.symbol}`} className="hover:text-emerald-400 transition-colors">
                                {t.symbol}
                              </Link>
                            </td>
                            <td className="py-4 px-6 text-right font-semibold font-mono-numbers text-slate-300">{t.qty || t.quantity}</td>
                            <td className="py-4 px-6 text-right font-semibold font-mono-numbers text-slate-400">
                              ${t.priceAtTrade?.toFixed(2)}
                            </td>
                            <td className="py-4 px-6 text-right font-extrabold font-mono-numbers text-slate-200">
                              ${t.totalValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className={`py-4 px-6 text-right font-mono-numbers font-extrabold ${
                              !isBuy && hasPnL ? (isPnLPos ? 'text-emerald-400' : 'text-red-400') : 'text-slate-600'
                            }`}>
                              {!isBuy && hasPnL ? (
                                <>
                                  <div>{isPnLPos ? '+' : ''}${t.pnl?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                                </>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
