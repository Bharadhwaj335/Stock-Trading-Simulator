import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { TrendingUp, TrendingDown, Bell } from 'lucide-react';
import { stockService, tradeService, alertService } from '../services/api';
import { useStockPriceSocket } from '../hooks/useSocket';
import { useAuthStore } from '../store/authStore';
import StockChart from '../components/charts/StockChart';
import toast from 'react-hot-toast';

const RANGES = ['1W', '1M', '3M', '6M', '1Y'];

export default function StockPage() {
  const { symbol = '' } = useParams();
  const user = useAuthStore(s => s.user);
  const qc   = useQueryClient();

  const [range,        setRange]    = useState('1M');
  const [tradeType,    setTradeType] = useState('BUY');
  const [qty,          setQty]      = useState(1);
  const [livePrice,    setLivePrice] = useState(null);
  const [alertModal,   setAlertModal] = useState(false);
  const [alertTarget,  setAlertTarget] = useState('');
  const [alertCond,    setAlertCond]   = useState('ABOVE');

  const { data: stock }   = useQuery(['stock', symbol], () => stockService.getOne(symbol).then(r => r.data.data));
  const { data: historyData } = useQuery(['history', symbol, range], () =>
    stockService.getHistory(symbol, range).then(r => r.data.data)
  );

  const history = Array.isArray(historyData) ? historyData : (historyData?.bars || []);

  useStockPriceSocket(symbol, data => {
    setLivePrice(data.currentPrice);
    qc.setQueryData(['stock', symbol], (old) =>
      old ? { ...old, currentPrice: data.currentPrice, change: data.change, changePercent: data.changePercent } : old
    );
  });

  const price    = livePrice ?? stock?.currentPrice ?? 0;
  const total    = price * qty;
  const canAfford = tradeType === 'BUY' ? total <= (user?.walletBalance || 0) : true;
  const up       = (stock?.changePercent ?? 0) >= 0;

  const tradeMutation = useMutation(
    (data) =>
      tradeType === 'BUY' ? tradeService.buy(data) : tradeService.sell(data),
    {
      onSuccess: res => {
        const pnl = res.data.pnl;
        toast.success(
          tradeType === 'BUY'
            ? `Bought ${qty} shares of ${symbol}`
            : `Sold ${qty} shares. P&L: ${pnl >= 0 ? '+' : ''}$${pnl?.toFixed(2)}`
        );
        qc.invalidateQueries('portfolio');
        qc.invalidateQueries('tradeHistory');
      },
      onError: (err) => {
        const msg = err.response?.data?.message || 'Trade failed';
        toast.error(msg);
      },
    }
  );

  const alertMutation = useMutation(
    () => alertService.create({ symbol, condition: alertCond, targetPrice: parseFloat(alertTarget), notifyEmail: false }),
    { onSuccess: () => { toast.success('Alert created'); setAlertModal(false); } }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">{symbol}</h1>
          <p className="text-slate-400">{stock?.name}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-4xl font-bold text-white">${price.toFixed(2)}</span>
            <span className={`flex items-center gap-1 text-lg ${up ? 'text-emerald-400' : 'text-red-400'}`}>
              {up ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              {up ? '+' : ''}{stock?.changePercent?.toFixed(2)}%
            </span>
          </div>
        </div>
        <button onClick={() => setAlertModal(true)}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg transition">
          <Bell size={16} /> Set Alert
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex gap-2 mb-4">
            {RANGES.map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1 rounded text-sm ${range === r ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                {r}
              </button>
            ))}
          </div>
          <StockChart data={history || []} />
        </div>

        {/* Trade panel */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex border border-slate-700 rounded-lg mb-4 overflow-hidden">
              <button onClick={() => setTradeType('BUY')}
                className={`flex-1 py-2.5 font-semibold text-sm transition ${tradeType === 'BUY' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                Buy
              </button>
              <button onClick={() => setTradeType('SELL')}
                className={`flex-1 py-2.5 font-semibold text-sm transition ${tradeType === 'SELL' ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                Sell
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-400 text-sm">Shares</label>
                <input type="number" min={1} value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white mt-1 focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Price per share</span>
                <span className="text-white">${price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-slate-300">Total</span>
                <span className="text-white">${total.toFixed(2)}</span>
              </div>
              {!canAfford && <p className="text-red-400 text-xs">Insufficient balance</p>}
              <button
                onClick={() => tradeMutation.mutate({ symbol, quantity: qty })}
                disabled={!canAfford || tradeMutation.isLoading}
                className={`w-full py-3 rounded-lg font-semibold transition disabled:opacity-50 ${
                  tradeType === 'BUY'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                    : 'bg-red-500 hover:bg-red-400 text-white'
                }`}>
                {tradeMutation.isLoading ? 'Processing...' : `${tradeType} ${qty} share${qty > 1 ? 's' : ''}`}
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800 text-sm text-slate-400">
              Cash available: <span className="text-white">${user?.walletBalance?.toLocaleString()}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            {[
              ['52W High',  `$${stock?.high52w?.toFixed(2) || '-'}`],
              ['52W Low',   `$${stock?.low52w?.toFixed(2) || '-'}`],
              ['Market Cap', `$${((stock?.marketCap || 0) / 1e9).toFixed(1)}B`],
              ['Volume',     `${((stock?.volume || 0) / 1e6).toFixed(1)}M`],
              ['Sector',     stock?.sector || '-'],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-slate-400">{label}</span>
                <span className="text-white">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alert modal */}
      {alertModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-white mb-4">Price Alert — {symbol}</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                {(['ABOVE', 'BELOW']).map(c => (
                  <button key={c} onClick={() => setAlertCond(c)}
                    className={`flex-1 py-2 rounded text-sm ${alertCond === c ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {c}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={alertTarget}
                onChange={e => setAlertTarget(e.target.value)}
                placeholder={`Target price (current: $${price.toFixed(2)})`}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
              <div className="flex gap-2">
                <button onClick={() => setAlertModal(false)} className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm">Cancel</button>
                <button onClick={() => alertMutation.mutate()} disabled={!alertTarget}
                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                  Create Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
