import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';
import { stockService } from '../services/api';
import { useMarketTickerSocket } from '../hooks/useSocket';

const SECTORS = ['All', 'Technology', 'Finance', 'Healthcare', 'Consumer', 'Energy', 'Entertainment', 'Automotive', 'Aerospace'];

export default function MarketPage() {
  const [search,  setSearch]  = useState('');
  const [sector,  setSector]  = useState('All');
  const [sort,    setSort]    = useState('marketCap');
  const [livePrices, setLivePrices] = useState({});

  const { data: stockData, isLoading } = useQuery('stocks', () =>
    stockService.getAll().then(r => r.data.data)
  );

  const stocks = Array.isArray(stockData) ? stockData : (stockData?.stocks || []);

  useMarketTickerSocket(tick => {
    setLivePrices(prev => ({
      ...prev,
      [tick.symbol]: { price: tick.currentPrice, change: tick.change, pct: tick.changePercent },
    }));
  });

  const filtered = stocks
    .filter((s) =>
      (sector === 'All' || s.sector === sector) &&
      (search === '' || s.symbol.toLowerCase().includes(search.toLowerCase()) || s.name.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => b[sort] - a[sort]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Market</h1>
        <p className="text-slate-400 mt-1">Live prices — updated every 30 seconds</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search stocks..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500">
          <option value="marketCap">Market Cap</option>
          <option value="changePercent">% Change</option>
          <option value="currentPrice">Price</option>
        </select>
      </div>

      {/* Sector pills */}
      <div className="flex gap-2 flex-wrap">
        {SECTORS.map(s => (
          <button key={s} onClick={() => setSector(s)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              sector === s
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              {['Symbol', 'Name', 'Price', 'Change', '% Change', 'Market Cap', 'Volume'].map(h => (
                <th key={h} className="text-left text-xs font-medium text-slate-400 px-4 py-3 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="text-center py-12 text-slate-500">Loading...</td></tr>
            )}
            {filtered.map((s) => {
              const live = livePrices[s.symbol];
              const price = live?.price ?? s.currentPrice;
              const pct   = live?.pct   ?? s.changePercent;
              const chg   = live?.change ?? s.change;
              const up    = pct >= 0;

              return (
                <tr key={s.symbol} className="border-b border-slate-800/50 hover:bg-slate-800/50 transition">
                  <td className="px-4 py-3">
                    <Link to={`/market/${s.symbol}`} className="font-semibold text-emerald-400 hover:text-emerald-300">
                      {s.symbol}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-sm">{s.name}</td>
                  <td className="px-4 py-3 text-white font-medium">${price.toFixed(2)}</td>
                  <td className={`px-4 py-3 text-sm ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                    {up ? '+' : ''}{chg.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-sm ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                      {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {up ? '+' : ''}{pct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm">
                    ${(s.marketCap / 1e9).toFixed(1)}B
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm">
                    {(s.volume / 1e6).toFixed(1)}M
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
