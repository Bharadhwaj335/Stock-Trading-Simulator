import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Bell, BellOff, Trash2, CheckCircle2, Edit2,
  AlertTriangle, Plus, Search, RefreshCw, X,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Sparkles, Activity
} from 'lucide-react';
import { alertService, stockService } from '../services/api';
import { useMarketTickerSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';

export default function AlertsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('ACTIVE');
  const [createModal, setCreateModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [livePrices, setLivePrices] = useState({});
  
  // Create Form State
  const [symbol, setSymbol] = useState('');
  const [condition, setCondition] = useState('ABOVE');
  const [targetPrice, setTargetPrice] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(false);

  // Queries
  const { data: alerts, isLoading: isAlertsLoading, refetch } = useQuery(
    ['alerts', activeTab],
    () => alertService.getAll(activeTab).then(r => r.data),
    { refetchOnWindowFocus: false }
  );

  const { data: stockData, isLoading: isStocksLoading } = useQuery(
    'alertStocks',
    () => stockService.getAll().then(r => r.data.data || r.data?.stocks || r.data || []),
    { refetchOnWindowFocus: false }
  );

  // WebSocket Live Pricing Sync
  useMarketTickerSocket(tick => {
    setLivePrices(prev => ({
      ...prev,
      [tick.symbol]: tick.currentPrice
    }));
  });

  const stocks = Array.isArray(stockData) ? stockData : (stockData?.stocks || []);
  
  const getCurrentPrice = (sym) => {
    if (livePrices[sym] !== undefined) {
      return livePrices[sym];
    }
    const found = stocks.find(s => s.symbol === sym);
    return found ? found.currentPrice : null;
  };

  // Mutations
  const createMutation = useMutation(
    (data) => alertService.create(data),
    {
      onSuccess: () => {
        toast.success('Price alert created successfully!');
        setCreateModal(false);
        setEditingAlert(null);
        // Clear form
        setSymbol('');
        setTargetPrice('');
        setCondition('ABOVE');
        setNotifyEmail(false);
        qc.invalidateQueries(['alerts', activeTab]);
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Failed to create alert');
      }
    }
  );

  const updateMutation = useMutation(
    ({ id, data }) => alertService.update(id, data),
    {
      onSuccess: () => {
        toast.success('Price alert updated successfully!');
        setCreateModal(false);
        setEditingAlert(null);
        // Clear form
        setSymbol('');
        setTargetPrice('');
        setCondition('ABOVE');
        setNotifyEmail(false);
        qc.invalidateQueries(['alerts', activeTab]);
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Failed to update alert');
      }
    }
  );

  const deleteMutation = useMutation(
    (id) => alertService.delete(id),
    {
      onSuccess: () => {
        toast.success('Alert deleted');
        qc.invalidateQueries(['alerts', activeTab]);
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Failed to delete alert');
      }
    }
  );

  const handleCreateAlert = (e) => {
    e.preventDefault();
    if (!symbol || !targetPrice) {
      toast.error('Please fill in all fields');
      return;
    }
    const payload = {
      symbol: symbol.toUpperCase(),
      condition,
      targetPrice: parseFloat(targetPrice),
      notifyEmail
    };

    if (editingAlert) {
      updateMutation.mutate({
        id: editingAlert._id,
        data: payload
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            <Bell size={24} className="text-emerald-400 animate-pulse" />
            Price Trigger Terminal
          </h1>
          <p className="text-xs text-slate-400 mt-1">Deploy real-time price monitoring and receive prompt email and local notifications.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              refetch();
              qc.invalidateQueries('alertStocks');
            }}
            className="flex items-center gap-2 bg-slate-900 border border-slate-900 hover:border-slate-800 hover:bg-slate-800/80 text-slate-300 px-4 py-2 rounded-xl transition text-xs font-bold"
          >
            <RefreshCw size={13} className="text-emerald-400" />
            Sync Feeds
          </button>
          <button 
            onClick={() => {
              setEditingAlert(null);
              setSymbol('');
              setCondition('ABOVE');
              setTargetPrice('');
              setNotifyEmail(false);
              setCreateModal(true);
            }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 px-4 py-2 rounded-xl transition text-xs font-extrabold shadow-lg shadow-emerald-500/10"
          >
            <Plus size={14} />
            Create Alert
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-900">
        <div className="flex gap-6">
          <button 
            onClick={() => setActiveTab('ACTIVE')}
            className={`pb-3 font-extrabold text-xs tracking-widest uppercase transition relative ${
              activeTab === 'ACTIVE' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Active Monitors
            {activeTab === 'ACTIVE' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('TRIGGERED')}
            className={`pb-3 font-extrabold text-xs tracking-widest uppercase transition relative ${
              activeTab === 'TRIGGERED' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Triggered History
            {activeTab === 'TRIGGERED' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Content Grid */}
      {isAlertsLoading || isStocksLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 bg-slate-900/50 border border-slate-800 rounded-2xl"></div>
          ))}
        </div>
      ) : !alerts || alerts.length === 0 ? (
        <div className="glass-card border-slate-900 rounded-2xl p-12 text-center shadow-xl">
          <div className="inline-flex p-4 rounded-xl bg-slate-950 border border-slate-900 text-slate-500 mb-4 select-none">
            <BellOff size={28} />
          </div>
          <h3 className="text-base font-black text-slate-200 mb-2">
            {activeTab === 'ACTIVE' ? 'No Active Alert Triggers' : 'Trigger Log is Empty'}
          </h3>
          <p className="text-slate-500 text-xs max-w-sm mx-auto mb-6 leading-relaxed font-semibold">
            {activeTab === 'ACTIVE' 
              ? "You don't have any price triggers running right now. Deploy one to monitor equity movements."
              : "No stock price targets have been breached in your history yet."}
          </p>
          {activeTab === 'ACTIVE' && (
            <button 
              onClick={() => {
                setEditingAlert(null);
                setSymbol('');
                setCondition('ABOVE');
                setTargetPrice('');
                setNotifyEmail(false);
                setCreateModal(true);
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-2.5 rounded-xl transition text-xs shadow-lg shadow-emerald-500/10"
            >
              Deploy First Trigger
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alerts.map((a) => {
            const isAbove = a.condition === 'ABOVE';
            const isTriggered = a.status === 'TRIGGERED';
            const currentPrice = getCurrentPrice(a.symbol);

            let progressPercent = 0;
            let diffText = 'Syncing...';
            let diffPercentText = '';
            
            if (isTriggered) {
              progressPercent = 100;
              diffText = `Triggered at $${(a.triggeredPrice || a.targetPrice).toFixed(2)}`;
            } else if (currentPrice !== null) {
              const target = a.targetPrice;
              if (isAbove) {
                progressPercent = Math.max(0, Math.min(100, (currentPrice / target) * 100));
                if (currentPrice >= target) {
                  progressPercent = 100;
                  diffText = 'Target met! Processing...';
                } else {
                  const diff = target - currentPrice;
                  const diffPct = (diff / currentPrice) * 100;
                  diffText = `$${diff.toFixed(2)} to go`;
                  diffPercentText = `${diffPct.toFixed(1)}% below target`;
                }
              } else {
                // BELOW
                progressPercent = Math.max(0, Math.min(100, (target / currentPrice) * 100));
                if (currentPrice <= target) {
                  progressPercent = 100;
                  diffText = 'Target met! Processing...';
                } else {
                  const diff = currentPrice - target;
                  const diffPct = (diff / currentPrice) * 100;
                  diffText = `$${diff.toFixed(2)} to drop`;
                  diffPercentText = `${diffPct.toFixed(1)}% above target`;
                }
              }
            }

            return (
              <div 
                key={a._id}
                className={`glass-card border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group shadow-lg ${
                  isTriggered 
                    ? 'border-slate-900/60 bg-slate-900/10' 
                    : 'border-slate-900/80 hover:border-slate-800'
                }`}
              >
                {/* Visual indicator bar on the left */}
                <div className={`absolute top-0 left-0 w-1 h-full ${
                  isTriggered 
                    ? 'bg-slate-700' 
                    : isAbove 
                      ? 'bg-gradient-to-b from-emerald-500 to-teal-500' 
                      : 'bg-gradient-to-b from-red-500 to-orange-500'
                }`} />

                <div className="pl-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-slate-100 tracking-tight">{a.symbol}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black border ${
                      isTriggered
                        ? 'bg-slate-950 text-slate-500 border-slate-900'
                        : isAbove
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10'
                          : 'bg-red-500/10 text-red-400 border-red-500/10'
                    }`}>
                      {isTriggered ? 'TRIGGERED' : isAbove ? '▲ ABOVE' : '▼ BELOW'}
                    </span>
                  </div>

                  {/* Dual metric grid */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-950/40 border border-slate-950 rounded-xl p-3">
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Current Price</span>
                      <span className="text-sm font-mono-numbers font-black text-slate-200 mt-0.5 block">
                        {currentPrice !== null ? `$${currentPrice.toFixed(2)}` : 'Syncing...'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Target Price</span>
                      <span className="text-sm font-mono-numbers font-black text-slate-200 mt-0.5 block">
                        ${a.targetPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Section */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                      <span>Progress</span>
                      <span className="font-mono-numbers font-extrabold text-slate-300">{progressPercent.toFixed(1)}%</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-950 h-2 rounded-full overflow-hidden relative">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isTriggered 
                            ? 'bg-slate-700' 
                            : isAbove 
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                              : 'bg-gradient-to-r from-red-500 to-orange-500'
                        }`} 
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-extrabold mt-1">
                      <span className="text-slate-400">{diffText}</span>
                      <span className={isAbove ? 'text-emerald-400/90' : 'text-red-400/90'}>{diffPercentText}</span>
                    </div>
                  </div>

                  <p className="text-[9px] text-slate-600 font-semibold">
                    Deployed: {new Date(a.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-950 pl-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isTriggered ? (
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                        <CheckCircle2 size={12} className="text-slate-500" /> Logged Archive
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold animate-pulse">
                        <Activity size={12} className="text-emerald-400" /> Live Monitoring
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {!isTriggered && (
                      <button
                        onClick={() => {
                          setSymbol(a.symbol);
                          setCondition(a.condition);
                          setTargetPrice(a.targetPrice.toString());
                          setNotifyEmail(!!a.notifyEmail);
                          setEditingAlert(a);
                          setCreateModal(true);
                        }}
                        className="p-1.5 text-slate-650 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition"
                        title="Edit Alert"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(a._id)}
                      disabled={deleteMutation.isLoading}
                      className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition"
                      title="Delete Alert"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Alert Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="glass-card border border-slate-900 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-950 flex items-center justify-between bg-slate-950/40">
              <h3 className="font-black text-slate-200 text-sm tracking-wide uppercase flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-400" />
                {editingAlert ? 'Edit Price Trigger' : 'Deploy Price Trigger'}
              </h3>
              <button 
                onClick={() => setCreateModal(false)}
                className="text-slate-500 hover:text-slate-200 transition"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleCreateAlert} className="p-5 space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Equity Symbol</label>
                <input
                  type="text"
                  placeholder="e.g. AAPL, TSLA, MSFT"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  disabled={!!editingAlert}
                  className="w-full bg-slate-950 border border-slate-950 rounded-xl px-4 py-2.5 text-slate-200 mt-1.5 focus:outline-none focus:border-emerald-500/80 text-xs uppercase font-extrabold placeholder-slate-700 tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Breach Direction</label>
                <div className="flex gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setCondition('ABOVE')}
                    className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                      condition === 'ABOVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-slate-950 text-slate-500 border-slate-950 hover:border-slate-800'
                    }`}
                  >
                    Goes Above
                  </button>
                  <button
                    type="button"
                    onClick={() => setCondition('BELOW')}
                    className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                      condition === 'BELOW'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-slate-950 text-slate-500 border-slate-950 hover:border-slate-800'
                    }`}
                  >
                    Goes Below
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Target Threshold ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-950 rounded-xl px-4 py-2.5 text-slate-200 mt-1.5 focus:outline-none focus:border-emerald-500/80 text-xs font-extrabold font-mono-numbers placeholder-slate-700"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="notifyEmail"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-950 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="notifyEmail" className="text-[10px] font-extrabold text-slate-400 select-none cursor-pointer">
                  Deploy email notification when breached
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-900 text-slate-400 rounded-xl text-xs border border-slate-950 transition font-bold"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-extrabold transition shadow-lg shadow-emerald-500/10"
                >
                  {createMutation.isLoading || updateMutation.isLoading 
                    ? 'Processing...' 
                    : editingAlert 
                      ? 'Update Monitor' 
                      : 'Deploy Monitor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
