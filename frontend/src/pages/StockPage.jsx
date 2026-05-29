import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { TrendingUp, TrendingDown, Bell, Star, StarOff, AlertCircle } from 'lucide-react';
import { stockService, tradeService, alertService, watchlistService, portfolioService, newsService } from '../services/api';
import { useStockPriceSocket } from '../hooks/useSocket';
import { useAuthStore } from '../store/authStore';
import StockChart from '../components/charts/StockChart';
import NewsCard from '../components/ui/NewsCard';
import Skeleton from '../components/ui/Skeleton';
import toast from 'react-hot-toast';

const RANGES = ['1W', '1M', '3M', '6M', '1Y'];

export default function StockPage() {
  const { symbol = '' } = useParams();
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();

  const [range, setRange] = useState('1M');
  const [tradeType, setTradeType] = useState('BUY'); // 'BUY' or 'SELL'
  const [qty, setQty] = useState(1);
  const [livePrice, setLivePrice] = useState(null);
  
  // Modals
  const [alertModal, setAlertModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [alertTarget, setAlertTarget] = useState('');
  const [alertCond, setAlertCond] = useState('ABOVE');
  const [alertNotifyEmail, setAlertNotifyEmail] = useState(false);

  // Order book state
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });

  // 1. Fetch stock basic data
  const { data: stock, isLoading: stockLoading } = useQuery(['stock', symbol], () => stockService.getOne(symbol).then(r => r.data.data));
  
  // 2. Fetch stock historical data
  const { data: historyData } = useQuery(['history', symbol, range], () =>
    stockService.getHistory(symbol, range).then(r => r.data.data)
  );
  const history = Array.isArray(historyData) ? historyData : (historyData?.bars || []);

  // 3. Fetch portfolio to check owned position quantity
  const { data: portfolio } = useQuery('portfolio', () => portfolioService.get());
  const holding = portfolio?.holdings?.find(h => h.symbol === symbol);
  const ownedQty = holding?.qty ?? holding?.quantity ?? 0;

  // 4. Fetch watchlist status
  const { data: watchlist } = useQuery('watchlist', () => watchlistService.get(), {
    refetchOnWindowFocus: false
  });
  const isWatched = (watchlist || []).some(w => w.symbol === symbol);

  // 5. Fetch stock-specific news
  const { data: news, isLoading: newsLoading } = useQuery(['news', symbol], () => newsService.getStock(symbol));

  // WebSocket live price updates
  useStockPriceSocket(symbol, data => {
    setLivePrice(data.currentPrice);
    qc.setQueryData(['stock', symbol], (old) =>
      old ? { ...old, currentPrice: data.currentPrice, change: data.change, changePercent: data.changePercent } : old
    );
  });

  const price = livePrice ?? stock?.currentPrice ?? 0;
  const total = price * qty;
  const canAfford = tradeType === 'BUY' ? total <= (user?.walletBalance ?? 30000) : true;
  const up = (stock?.changePercent ?? 0) >= 0;

  // Interactive Live Order Book Ticker simulation
  useEffect(() => {
    if (!price) return;
    const generateBook = () => {
      const spread = parseFloat((price * 0.0004).toFixed(2)) || 0.05;
      const decimalPlaces = 2;
      const asks = [];
      const bids = [];

      for (let i = 1; i <= 5; i++) {
        const askPrice = price + (spread / 2) + ((i - 1) * 0.03);
        const bidPrice = price - (spread / 2) - ((i - 1) * 0.03);
        asks.unshift({
          price: parseFloat(askPrice.toFixed(decimalPlaces)),
          size: Math.floor(Math.random() * 450) + 50,
          total: 0
        });
        bids.push({
          price: parseFloat(bidPrice.toFixed(decimalPlaces)),
          size: Math.floor(Math.random() * 450) + 50,
          total: 0
        });
      }

      let askTotal = 0;
      for (let i = asks.length - 1; i >= 0; i--) {
        askTotal += asks[i].size;
        asks[i].total = askTotal;
      }
      let bidTotal = 0;
      for (let i = 0; i < bids.length; i++) {
        bidTotal += bids[i].size;
        bids[i].total = bidTotal;
      }
      setOrderBook({ bids, asks });
    };

    generateBook();
    const timer = setInterval(() => {
      setOrderBook(prev => {
        const randomize = (levels) => levels.map(l => ({
          ...l,
          size: Math.max(10, l.size + Math.floor(Math.random() * 41) - 20)
        }));
        const bids = randomize(prev.bids);
        const asks = randomize(prev.asks);

        let askTotal = 0;
        for (let i = asks.length - 1; i >= 0; i--) {
          askTotal += asks[i].size;
          asks[i].total = askTotal;
        }
        let bidTotal = 0;
        for (let i = 0; i < bids.length; i++) {
          bidTotal += bids[i].size;
          bids[i].total = bidTotal;
        }
        return { bids, asks };
      });
    }, 1500);

    return () => clearInterval(timer);
  }, [price]);

  // Watchlist favorite/unfavorite triggers
  const watchMutation = useMutation(
    () => isWatched ? watchlistService.remove(symbol) : watchlistService.add(symbol),
    {
      onSuccess: () => {
        toast.success(isWatched ? `${symbol} removed from watchlist` : `${symbol} added to watchlist`);
        qc.invalidateQueries('watchlist');
      },
      onError: () => toast.error('Failed to update watchlist')
    }
  );

  // Trade submission mutation
  const tradeMutation = useMutation(
    (data) => tradeType === 'BUY' ? tradeService.buy(data) : tradeService.sell(data),
    {
      onSuccess: res => {
        const finalPnL = res.data.pnl ?? res.data.data?.trade?.pnl;
        toast.success(
          tradeType === 'BUY'
            ? `Successfully bought ${qty} shares of ${symbol}!`
            : `Successfully sold ${qty} shares! Return: ${finalPnL >= 0 ? '+' : ''}$${finalPnL?.toFixed(2)}`
        );
        setConfirmModal(false);
        setQty(1);
        qc.invalidateQueries('portfolio');
        qc.invalidateQueries('tradeHistory');
        qc.invalidateQueries('analytics');
      },
      onError: (err) => {
        const msg = err.response?.data?.message || 'Trade failed';
        toast.error(msg);
        setConfirmModal(false);
      },
    }
  );

  // Alert creation mutation
  const alertMutation = useMutation(
    () => alertService.create({ symbol, condition: alertCond, targetPrice: parseFloat(alertTarget), notifyEmail: !!alertNotifyEmail }),
    { 
      onSuccess: () => { 
        toast.success('Price alert has been established'); 
        setAlertModal(false); 
        setAlertTarget('');
        setAlertNotifyEmail(false);
        qc.invalidateQueries(['alerts', 'ACTIVE']);
      },
      onError: () => toast.error('Failed to create alert')
    }
  );

  const handleExecuteTrade = () => {
    tradeMutation.mutate({ symbol, quantity: qty });
  };

  // Calculate dynamic maximums for sliders
  const maxBuyShares = price > 0 ? Math.floor((user?.walletBalance ?? 30000) / price) : 1;
  const maxSliderQty = tradeType === 'BUY' ? Math.max(1, maxBuyShares) : Math.max(1, ownedQty);

  return (
    <div className="space-y-8 animate-fadeIn font-sans">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-100 tracking-tight">{symbol}</h1>
            {stock?.sector && (
              <span className="text-[9px] font-extrabold uppercase bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-md tracking-wider">
                {stock.sector}
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-slate-400 mt-1">{stock?.name}</p>
          
          <div className="flex items-center gap-3 mt-3">
            <span className="text-3xl font-black font-mono-numbers text-slate-100 tracking-tight">${price?.toFixed(2)}</span>
            <span className={`flex items-center gap-1 font-mono-numbers font-extrabold text-sm ${up ? 'text-emerald-400' : 'text-red-400'}`}>
              {up ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              {up ? '+' : ''}{stock?.changePercent?.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => watchMutation.mutate()}
            disabled={watchMutation.isLoading}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
              isWatched
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Star size={14} className={isWatched ? 'fill-current' : ''} />
            <span>{isWatched ? 'Watching' : 'Watchlist'}</span>
          </button>
          
          <button
            onClick={() => setAlertModal(true)}
            className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition"
          >
            <Bell size={14} className="text-emerald-400" />
            <span>Set Alert</span>
          </button>
        </div>
      </div>

      {/* Owned position banner indicator */}
      {ownedQty > 0 && (
        <div className="glass-card rounded-2xl border-emerald-500/10 p-3 bg-emerald-500/5 flex items-center gap-3">
          <span className="text-lg">💼</span>
          <span className="text-xs text-slate-300">
            You currently hold <span className="text-emerald-400 font-extrabold">{ownedQty} shares</span> of this stock in your open portfolio positions.
          </span>
        </div>
      )}

      {/* Main trading screen grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Interactive Chart and Live Level 2 Depth */}
        <div className="xl:col-span-2 space-y-6">
          {/* Interactive Chart widget */}
          <div className="glass-card rounded-2xl border-slate-900 p-6 flex flex-col gap-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-900/50 pb-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Historical Valuations</h3>
              
              <div className="flex bg-slate-950 border border-slate-900 rounded-xl p-0.5">
                {RANGES.map(r => {
                  const isActive = range === r;
                  return (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-colors ${
                        isActive ? 'bg-slate-900 text-emerald-400 font-black' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="w-full">
              {stockLoading ? (
                <Skeleton className="h-72 w-full animate-pulse" />
              ) : (
                <StockChart data={history} />
              )}
            </div>
          </div>

          {/* Live Order Book & Spread Card */}
          <div className="glass-card rounded-2xl border-slate-900 p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Live Order Book & Depth</h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5 tracking-wider">Level 2 market depth updating in real-time</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Asks (Sells) Table */}
              <div className="space-y-1">
                <div className="grid grid-cols-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-900/50">
                  <span>Ask Price ($)</span>
                  <span className="text-right">Size (Qty)</span>
                  <span className="text-right">Total depth</span>
                </div>
                <div className="divide-y divide-slate-900/20 font-mono-numbers">
                  {orderBook.asks?.map((ask, i) => (
                    <div key={i} className="grid grid-cols-3 py-1.5 hover:bg-slate-900/20 rounded px-1 transition relative overflow-hidden group">
                      <div className="absolute right-0 top-0 bottom-0 bg-red-500/5 transition-all duration-500 pointer-events-none" style={{ width: `${Math.min(100, (ask.total / 1800) * 100)}%` }} />
                      <span className="text-red-400 font-bold z-10">${ask.price.toFixed(2)}</span>
                      <span className="text-right text-slate-400 font-medium z-10">{ask.size}</span>
                      <span className="text-right text-slate-500 font-semibold z-10">{ask.total}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bids (Buys) Table */}
              <div className="space-y-1">
                <div className="grid grid-cols-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-900/50">
                  <span>Bid Price ($)</span>
                  <span className="text-right">Size (Qty)</span>
                  <span className="text-right">Total depth</span>
                </div>
                <div className="divide-y divide-slate-900/20 font-mono-numbers">
                  {orderBook.bids?.map((bid, i) => (
                    <div key={i} className="grid grid-cols-3 py-1.5 hover:bg-slate-900/20 rounded px-1 transition relative overflow-hidden group">
                      <div className="absolute right-0 top-0 bottom-0 bg-emerald-500/5 transition-all duration-500 pointer-events-none" style={{ width: `${Math.min(100, (bid.total / 1800) * 100)}%` }} />
                      <span className="text-emerald-400 font-bold z-10">${bid.price.toFixed(2)}</span>
                      <span className="text-right text-slate-400 font-medium z-10">{bid.size}</span>
                      <span className="text-right text-slate-500 font-semibold z-10">{bid.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Spread display footer bar */}
            <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-3 flex justify-between items-center text-[10px] uppercase font-bold text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Simulated Spread:</span>
                <span className="text-slate-300 font-mono-numbers font-black ml-0.5">
                  ${orderBook.asks && orderBook.bids && orderBook.asks.length > 0 && orderBook.bids.length > 0 
                    ? (orderBook.asks[orderBook.asks.length - 1].price - orderBook.bids[0].price).toFixed(2) 
                    : '0.05'}
                </span>
              </div>
              <div className="font-mono-numbers text-[9px]">
                Liquidity Pool Depth: <span className="text-emerald-400">{orderBook.asks?.reduce((a, b) => a + b.size, 0) + orderBook.bids?.reduce((a, b) => a + b.size, 0) || '2,400'} shares</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trade Submission & Detail Stats */}
        <div className="space-y-6">
          {/* Trade Execution card */}
          <div className="glass-card rounded-2xl border-slate-900 p-5 shadow-xl">
            {/* Action selector */}
            <div className="flex bg-slate-950/80 border border-slate-900 rounded-xl p-0.5 mb-6">
              <button
                onClick={() => { setTradeType('BUY'); setQty(1); }}
                className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-all duration-300 ${
                  tradeType === 'BUY' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                BUY POSITION
              </button>
              <button
                onClick={() => { setTradeType('SELL'); setQty(1); }}
                className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-all duration-300 ${
                  tradeType === 'SELL' ? 'bg-red-500 text-slate-100 font-black' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                SELL POSITION
              </button>
            </div>

            <div className="space-y-5">
              {/* Inputs */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Share Quantity</label>
                  <span className="text-[10px] font-bold text-slate-400 font-mono-numbers">
                    {qty} shares
                  </span>
                </div>
                
                <input
                  type="number"
                  min={1}
                  max={maxSliderQty}
                  value={qty}
                  onChange={e => setQty(Math.max(1, Math.min(maxSliderQty, parseInt(e.target.value) || 1)))}
                  className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-slate-200 text-sm font-semibold focus:outline-none focus:border-emerald-500/50 mb-3"
                />

                {/* Range Slider for wow factor */}
                <input
                  type="range"
                  min={1}
                  max={maxSliderQty}
                  value={qty}
                  onChange={e => setQty(parseInt(e.target.value) || 1)}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                
                <div className="flex justify-between text-[8px] text-slate-500 font-extrabold uppercase tracking-wider mt-1 px-0.5">
                  <span>1 Share</span>
                  <span>Max: {maxSliderQty} shares</span>
                </div>
              </div>

              {/* Price list details */}
              <div className="space-y-2 border-t border-slate-900/60 pt-4 text-xs font-semibold">
                <div className="flex justify-between">
                  <span className="text-slate-500">Valuation per share</span>
                  <span className="text-slate-200 font-mono-numbers">${price?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold border-b border-slate-900/60 pb-3 mt-1.5">
                  <span className="text-slate-300 uppercase tracking-wide">Total Order Cost</span>
                  <span className="text-slate-100 font-mono-numbers">${total?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Warnings */}
              {tradeType === 'BUY' && !canAfford && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 bg-red-500/5 border border-red-500/10 p-2 rounded-lg">
                  <AlertCircle size={12} />
                  <span>Order exceeds virtual cash balance</span>
                </div>
              )}

              {tradeType === 'SELL' && ownedQty === 0 && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 bg-amber-500/5 border border-amber-500/10 p-2 rounded-lg">
                  <AlertCircle size={12} />
                  <span>You do not hold any shares of this stock</span>
                </div>
              )}

              {/* Trigger */}
              <button
                onClick={() => setConfirmModal(true)}
                disabled={!canAfford || (tradeType === 'SELL' && ownedQty === 0) || tradeMutation.isLoading}
                className={`w-full py-3.5 rounded-xl text-xs font-extrabold tracking-wider transition-all shadow-md ${
                  tradeType === 'BUY'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/5'
                    : 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-400 hover:to-rose-400 text-slate-100 shadow-red-500/5'
                } disabled:opacity-30 disabled:pointer-events-none`}
              >
                SUBMIT ORDER
              </button>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-900 text-[10px] text-slate-500 font-bold uppercase tracking-wider flex justify-between">
              <span>Cash Capital Available</span>
              <span className="text-slate-300 font-mono-numbers">${user?.walletBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Quick Alert Deployment panel */}
          <div className="glass-card rounded-2xl border-slate-900 p-5 space-y-4 shadow-xl relative overflow-hidden group">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 border-b border-slate-900/60 pb-2 flex items-center gap-1.5">
              <Bell size={12} className="text-emerald-400" />
              Deploy Quick Target Alert
            </h3>
            
            <div className="flex bg-slate-950 border border-slate-900 rounded-xl p-0.5">
              {(['ABOVE', 'BELOW']).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAlertCond(c)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold transition-colors ${
                    alertCond === c ? 'bg-slate-900 text-emerald-400 font-black' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {c === 'ABOVE' ? 'Ticking Above' : 'Ticking Below'}
                </button>
              ))}
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[8px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5 block">Target Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={alertTarget}
                  onChange={e => setAlertTarget(e.target.value)}
                  placeholder={`Target (current: $${price?.toFixed(2)})`}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-slate-200 text-xs font-semibold focus:outline-none placeholder-slate-700 font-mono-numbers"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="directAlertNotifyEmail"
                  checked={alertNotifyEmail}
                  onChange={e => setAlertNotifyEmail(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-emerald-500 bg-slate-950 border-slate-900 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="directAlertNotifyEmail" className="text-[9px] font-extrabold text-slate-400 select-none cursor-pointer">
                  Deploy email notification upon breach
                </label>
              </div>

              <button
                onClick={() => alertMutation.mutate()}
                disabled={!alertTarget || alertMutation.isLoading}
                className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold rounded-xl text-xs transition duration-300 shadow-md shadow-emerald-500/10 disabled:opacity-30 disabled:pointer-events-none"
              >
                {alertMutation.isLoading ? 'Deploying...' : 'Deploy Target Monitor'}
              </button>
            </div>
          </div>

          {/* Quick stats panel */}
          <div className="glass-card rounded-2xl border-slate-900 p-5 space-y-3.5 shadow-xl">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 border-b border-slate-900/60 pb-2">Key Metrics</h3>
            {[
              ['52-Week High', `$${stock?.high52w?.toFixed(2) || '-'}`],
              ['52-Week Low', `$${stock?.low52w?.toFixed(2) || '-'}`],
              ['Market Capitalization', `$${((stock?.marketCap || 0) / 1e9).toFixed(1)} Billion`],
              ['Trading Volume Value', `${((stock?.volume || 0) / 1e6).toFixed(1)} Million`],
              ['Sector exposure category', stock?.sector || 'Other'],
            ].map(([lbl, val]) => (
              <div key={lbl} className="flex justify-between text-[11px] font-semibold">
                <span className="text-slate-400">{lbl}</span>
                <span className="text-slate-200 font-mono-numbers">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Asset Specific News section */}
      <div className="glass-card rounded-2xl border-slate-900 p-6 shadow-xl flex flex-col gap-6">
        <div>
          <h2 className="text-sm font-bold text-slate-200">Recent {symbol} Company News</h2>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Top stories and coverage specific to {symbol}</p>
        </div>

        {newsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full animate-pulse" />)}
          </div>
        ) : !news || news.length === 0 ? (
          <p className="text-xs text-slate-500 font-semibold py-6">No recent articles found for {symbol}.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {news.slice(0, 3).map((item) => (
              <NewsCard key={item.id} {...item} />
            ))}
          </div>
        )}
      </div>

      {/* Double confirm transaction Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="w-full max-w-sm glass-card border-slate-800 rounded-2xl p-6 shadow-2xl animate-slideUp">
            <h3 className="font-extrabold text-sm text-slate-200 mb-3 tracking-tight">Confirm Trade Order</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Are you sure you want to <span className={tradeType === 'BUY' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{tradeType}</span> <span className="font-bold text-slate-200">{qty} shares</span> of <span className="font-bold text-slate-200">{symbol}</span> for a total of <span className="font-bold text-slate-100 font-mono-numbers">${total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmModal(false)} className="flex-1 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 font-bold rounded-xl text-xs transition duration-300">
                Cancel
              </button>
              <button
                onClick={handleExecuteTrade}
                disabled={tradeMutation.isLoading}
                className={`flex-1 py-2.5 font-bold rounded-xl text-xs transition duration-300 ${
                  tradeType === 'BUY'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950'
                    : 'bg-gradient-to-r from-red-500 to-rose-500 text-slate-100'
                }`}
              >
                {tradeMutation.isLoading ? 'Processing...' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redesigned price target Alert modal */}
      {alertModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="w-full max-w-sm glass-card border-slate-800 rounded-2xl p-6 shadow-2xl animate-slideUp">
            <h3 className="font-extrabold text-sm text-slate-200 mb-2 tracking-tight">Set Price Alert — {symbol}</h3>
            <p className="text-[10px] text-slate-400 mb-6 font-semibold uppercase">Get notified the second stock ticks past your target</p>
            
            <div className="space-y-4">
              <div className="flex bg-slate-950 border border-slate-900 rounded-xl p-0.5">
                {(['ABOVE', 'BELOW']).map(c => (
                  <button
                    key={c}
                    onClick={() => setAlertCond(c)}
                    className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-colors ${
                      alertCond === c ? 'bg-slate-900 text-emerald-400 font-black' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {c === 'ABOVE' ? 'Ticking Above' : 'Ticking Below'}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 mb-2 block">Target Target Price</label>
                <input
                  type="number"
                  value={alertTarget}
                  onChange={e => setAlertTarget(e.target.value)}
                  placeholder={`Target value (current: $${price?.toFixed(2)})`}
                  className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-slate-200 text-xs font-semibold focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setAlertModal(false)} className="flex-1 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 font-bold rounded-xl text-xs transition duration-300">
                  Cancel
                </button>
                <button
                  onClick={() => alertMutation.mutate()}
                  disabled={!alertTarget || alertMutation.isLoading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold rounded-xl text-xs transition duration-300 disabled:opacity-30"
                >
                  Create Target Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
