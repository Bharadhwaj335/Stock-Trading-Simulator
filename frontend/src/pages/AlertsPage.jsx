import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Bell, BellOff, Trash2, CheckCircle2, 
  AlertTriangle, Plus, Search, RefreshCw, X 
} from 'lucide-react';
import { alertService } from '../services/api';
import toast from 'react-hot-toast';

export default function AlertsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('ACTIVE');
  const [createModal, setCreateModal] = useState(false);
  
  // Create Form State
  const [symbol, setSymbol] = useState('');
  const [condition, setCondition] = useState('ABOVE');
  const [targetPrice, setTargetPrice] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(false);

  // Queries
  const { data: alerts, isLoading, refetch } = useQuery(
    ['alerts', activeTab],
    () => alertService.getAll(activeTab).then(r => r.data),
    { refetchOnWindowFocus: false }
  );

  // Mutations
  const createMutation = useMutation(
    (data) => alertService.create(data),
    {
      onSuccess: () => {
        toast.success('Price alert created successfully!');
        setCreateModal(false);
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
    createMutation.mutate({
      symbol: symbol.toUpperCase(),
      condition,
      targetPrice: parseFloat(targetPrice),
      notifyEmail
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Bell size={28} className="text-emerald-400" />
            Price Alerts
          </h1>
          <p className="text-slate-400 mt-1">Get notified when stocks hit your specific price thresholds.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => refetch()}
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg transition text-sm font-medium"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
          <button 
            onClick={() => setCreateModal(true)}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-lg transition text-sm font-bold"
          >
            <Plus size={16} />
            Create Alert
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <div className="flex gap-6">
          <button 
            onClick={() => setActiveTab('ACTIVE')}
            className={`pb-3 font-semibold text-sm transition relative ${
              activeTab === 'ACTIVE' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Active Alerts
            {activeTab === 'ACTIVE' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('TRIGGERED')}
            className={`pb-3 font-semibold text-sm transition relative ${
              activeTab === 'TRIGGERED' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
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
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-900/50 border border-slate-800 rounded-xl"></div>
          ))}
        </div>
      ) : !alerts || alerts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <div className="inline-flex p-4 rounded-full bg-slate-800 text-slate-500 mb-4">
            <BellOff size={32} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            {activeTab === 'ACTIVE' ? 'No Active Alerts' : 'No Triggered Alerts'}
          </h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">
            {activeTab === 'ACTIVE' 
              ? "You don't have any price triggers running right now. Set one up to get notified of price action!"
              : "No stock prices have hit your alert triggers yet."}
          </p>
          {activeTab === 'ACTIVE' && (
            <button 
              onClick={() => setCreateModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-lg transition inline-flex items-center gap-1.5"
            >
              Create First Alert
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alerts.map((a) => {
            const isAbove = a.condition === 'ABOVE';
            const isTriggered = a.status === 'TRIGGERED';

            return (
              <div 
                key={a._id}
                className={`bg-slate-900 border rounded-xl p-5 flex flex-col justify-between transition relative overflow-hidden group ${
                  isTriggered 
                    ? 'border-slate-800 bg-slate-900/40' 
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Visual indicator corner */}
                <div className={`absolute top-0 right-0 w-2 h-full ${
                  isTriggered ? 'bg-slate-700' : isAbove ? 'bg-emerald-500' : 'bg-red-500'
                }`} />

                <div className="pr-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-white tracking-wide">{a.symbol}</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                      isTriggered
                        ? 'bg-slate-800 text-slate-400 border-slate-700'
                        : isAbove
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {isTriggered ? 'TRIGGERED' : isAbove ? 'GOES ABOVE' : 'GOES BELOW'}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-slate-400 text-xs font-semibold">Target Price:</span>
                    <span className="text-2xl font-bold text-white">${a.targetPrice.toFixed(2)}</span>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2">
                    Created: {new Date(a.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-850 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isTriggered ? (
                      <span className="flex items-center gap-1 text-xs text-slate-400 font-semibold">
                        <CheckCircle2 size={13} className="text-slate-400" /> Met Price Mark
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                        <AlertTriangle size={13} className="text-emerald-400" /> Active Monitor
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => deleteMutation.mutate(a._id)}
                    disabled={deleteMutation.isLoading}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    title="Delete Alert"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Alert Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-lg text-white">Create Price Alert</h3>
              <button 
                onClick={() => setCreateModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateAlert} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stock Symbol</label>
                <input
                  type="text"
                  placeholder="e.g. AAPL, TSLA"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white mt-1.5 focus:outline-none focus:border-emerald-500 text-sm uppercase font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alert Condition</label>
                <div className="flex gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setCondition('ABOVE')}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition ${
                      condition === 'ABOVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Goes Above
                  </button>
                  <button
                    type="button"
                    onClick={() => setCondition('BELOW')}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition ${
                      condition === 'BELOW'
                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Goes Below
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white mt-1.5 focus:outline-none focus:border-emerald-500 text-sm font-semibold"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="notifyEmail"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-800 focus:ring-0 focus:ring-offset-0"
                />
                <label htmlFor="notifyEmail" className="text-xs font-semibold text-slate-300 select-none cursor-pointer">
                  Send email notification when hit
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-lg text-sm border border-slate-800 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-lg text-sm font-bold transition"
                >
                  {createMutation.isLoading ? 'Creating...' : 'Create Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
