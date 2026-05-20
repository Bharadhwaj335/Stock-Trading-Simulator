import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, TrendingDown, DollarSign, Briefcase, 
  Clock, ArrowUpRight, ArrowDownLeft, RefreshCw 
} from 'lucide-react';
import { portfolioService, tradeService } from '../services/api';
import { useMarketTickerSocket } from '../hooks/useSocket';

const StatCard = ({ label, value, subText, positive, icon: Icon }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
    <div>
      <p className="text-slate-400 text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {subText && (
        <p className={`text-xs mt-1 font-semibold flex items-center gap-0.5 ${
          positive ? 'text-emerald-400' : positive === false ? 'text-red-400' : 'text-slate-400'
        }`}>
          {positive ? '▲' : positive === false ? '▼' : ''} {subText}
        </p>
      )}
    </div>
    <div className={`p-3 rounded-lg ${
      positive ? 'bg-emerald-500/10 text-emerald-400' : positive === false ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-400'
    }`}>
      {Icon && <Icon size={22} />}
    </div>
  </div>
);

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState('holdings');
  const [livePrices, setLivePrices] = useState({});

  // Queries
  const { 
    data: portfolio, 
    isLoading: portfolioLoading, 
    refetch: refetchPortfolio 
  } = useQuery('portfolio', () => portfolioService.get().then(r => r.data), {
    refetchOnWindowFocus: false,
  });

  const { 
    data: tradesData, 
    isLoading: tradesLoading,
    refetch: refetchTrades
  } = useQuery('tradeHistory', () => tradeService.getHistory({ limit: 50 }).then(r => r.data.data), {
    refetchOnWindowFocus: false,
  });

  // Websocket listener for live prices
  useMarketTickerSocket(tick => {
    setLivePrices(prev => ({ ...prev, [tick.symbol]: tick.currentPrice }));
  });

  const handleRefresh = () => {
    refetchPortfolio();
    refetchTrades();
  };

  const summary = portfolio?.summary;
  const holdings = portfolio?.holdings || [];
  const trades = tradesData || [];

  // Calculate live values
  let livePortfolioValue = 0;
  let totalCost = 0;

  const enrichedHoldings = holdings.map(h => {
    const currentPrice = livePrices[h.symbol] || h.currentPrice || h.avgBuyPrice;
    const currentValue = currentPrice * h.quantity;
    const pnl = currentValue - h.totalInvested;
    const pnlPercent = h.totalInvested > 0 ? (pnl / h.totalInvested) * 100 : 0;
    
    livePortfolioValue += currentValue;
    totalCost += h.totalInvested;

    return {
      ...h,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Portfolio</h1>
          <p className="text-slate-400 mt-1">Manage your holdings, balances, and view trading transactions.</p>
        </div>
        <button 
          onClick={handleRefresh}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg transition text-sm font-medium"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {portfolioLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-900/50 border border-slate-800 rounded-xl"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            label="Net Worth" 
            value={`$${liveNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={Briefcase}
          />
          <StatCard 
            label="Cash Balance" 
            value={`$${liveWalletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={DollarSign}
          />
          <StatCard 
            label="Portfolio Value" 
            value={`$${livePortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={TrendingUp}
            positive={livePortfolioValue > totalCost ? true : livePortfolioValue < totalCost ? false : undefined}
          />
          <StatCard 
            label="Total P&L" 
            value={`${isPnLPositive ? '+' : ''}$${liveTotalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subText={`${liveTotalPnLPercent.toFixed(2)}%`}
            positive={isPnLPositive}
            icon={isPnLPositive ? TrendingUp : TrendingDown}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <div className="flex gap-6">
          <button 
            onClick={() => setActiveTab('holdings')}
            className={`pb-3 font-semibold text-sm transition relative ${
              activeTab === 'holdings' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Active Holdings
            {activeTab === 'holdings' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`pb-3 font-semibold text-sm transition relative ${
              activeTab === 'history' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Transaction History
            {activeTab === 'history' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {activeTab === 'holdings' ? (
          <div>
            {portfolioLoading ? (
              <div className="p-12 text-center text-slate-500 animate-pulse">Loading holdings...</div>
            ) : enrichedHoldings.length === 0 ? (
              <div className="p-12 text-center">
                <div className="inline-flex p-4 rounded-full bg-slate-800 text-slate-400 mb-4">
                  <Briefcase size={32} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No Holdings Found</h3>
                <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">
                  You haven't bought any stocks yet. Head over to the Market page to explore and make your first simulated trade!
                </p>
                <Link 
                  to="/market" 
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-lg transition inline-flex items-center gap-1.5"
                >
                  Explore Market
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-4 px-6">Stock</th>
                      <th className="py-4 px-6 text-right">Shares Held</th>
                      <th className="py-4 px-6 text-right">Avg Cost Basis</th>
                      <th className="py-4 px-6 text-right">Total Invested</th>
                      <th className="py-4 px-6 text-right">Current Price</th>
                      <th className="py-4 px-6 text-right">Current Value</th>
                      <th className="py-4 px-6 text-right">Total Return</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-sm">
                    {enrichedHoldings.map((h) => {
                      const pos = h.pnl >= 0;
                      return (
                        <tr key={h.symbol} className="hover:bg-slate-800/40 transition">
                          <td className="py-4 px-6 font-semibold text-white">
                            <Link to={`/market/${h.symbol}`} className="hover:text-emerald-400 transition flex flex-col">
                              <span className="text-base">{h.symbol}</span>
                            </Link>
                          </td>
                          <td className="py-4 px-6 text-right text-slate-300 font-medium">{h.quantity}</td>
                          <td className="py-4 px-6 text-right text-slate-300 font-medium">
                            ${h.avgBuyPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6 text-right text-slate-300 font-medium">
                            ${h.totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6 text-right text-emerald-400 font-semibold">
                            ${h.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6 text-right text-white font-semibold">
                            ${h.currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className={`py-4 px-6 text-right font-bold ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                            <div>{pos ? '+' : ''}${h.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <div className="text-xs font-semibold">{pos ? '+' : ''}{h.pnlPercent.toFixed(2)}%</div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <Link 
                              to={`/market/${h.symbol}`}
                              className="text-emerald-400 hover:text-emerald-300 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-md text-xs font-bold transition inline-flex items-center gap-1"
                            >
                              Trade
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
        ) : (
          <div>
            {tradesLoading ? (
              <div className="p-12 text-center text-slate-500 animate-pulse">Loading transaction history...</div>
            ) : trades.length === 0 ? (
              <div className="p-12 text-center">
                <div className="inline-flex p-4 rounded-full bg-slate-800 text-slate-400 mb-4">
                  <Clock size={32} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No Transactions Yet</h3>
                <p className="text-slate-400 text-sm max-w-sm mx-auto">
                  Your simulated trade execution logs will appear here once you complete a trade.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-4 px-6">Date</th>
                      <th className="py-4 px-6">Type</th>
                      <th className="py-4 px-6">Stock</th>
                      <th className="py-4 px-6 text-right">Shares</th>
                      <th className="py-4 px-6 text-right">Execution Price</th>
                      <th className="py-4 px-6 text-right">Total Amount</th>
                      <th className="py-4 px-6 text-right">Realized Return</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
                    {trades.map((t) => {
                      const isBuy = t.type === 'BUY';
                      const hasPnL = t.pnl !== undefined && t.pnl !== null;
                      const isPnLPos = (t.pnl || 0) >= 0;

                      return (
                        <tr key={t._id} className="hover:bg-slate-800/40 transition">
                          <td className="py-4 px-6 text-xs text-slate-400 font-medium">
                            {new Date(t.executedAt).toLocaleString()}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isBuy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {isBuy ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                              {t.type}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-semibold text-white">
                            <Link to={`/market/${t.symbol}`} className="hover:text-emerald-400 transition">
                              {t.symbol}
                            </Link>
                          </td>
                          <td className="py-4 px-6 text-right font-medium">{t.quantity}</td>
                          <td className="py-4 px-6 text-right font-medium">
                            ${t.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6 text-right font-medium">
                            ${t.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className={`py-4 px-6 text-right font-bold ${
                            !isBuy && hasPnL ? (isPnLPos ? 'text-emerald-400' : 'text-red-400') : 'text-slate-500'
                          }`}>
                            {!isBuy && hasPnL ? (
                              <>
                                <div>{isPnLPos ? '+' : ''}${t.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                <div className="text-xs font-semibold">{isPnLPos ? '+' : ''}{t.pnlPercent?.toFixed(2)}%</div>
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
        )}
      </div>
    </div>
  );
}
