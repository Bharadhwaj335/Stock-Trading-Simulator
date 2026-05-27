import React, { useEffect, useState } from 'react';
import { useMarketTickerSocket } from '../../hooks/useSocket';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const INITIAL_STOCKS = [
  { symbol: 'AAPL', currentPrice: 175.50, changePercent: 1.2 },
  { symbol: 'MSFT', currentPrice: 415.20, changePercent: -0.4 },
  { symbol: 'NVDA', currentPrice: 875.12, changePercent: 4.8 },
  { symbol: 'TSLA', currentPrice: 172.40, changePercent: -2.3 },
  { symbol: 'AMZN', currentPrice: 178.15, changePercent: 0.9 },
  { symbol: 'GOOGL', currentPrice: 151.60, changePercent: 1.5 },
  { symbol: 'META', currentPrice: 505.40, changePercent: -1.1 },
  { symbol: 'NFLX', currentPrice: 610.80, changePercent: 0.5 },
  { symbol: 'AMD', currentPrice: 180.20, changePercent: 3.2 },
  { symbol: 'COIN', currentPrice: 242.50, changePercent: -5.4 }
];

export default function MarketTicker() {
  const [stocks, setStocks] = useState(INITIAL_STOCKS);

  useMarketTickerSocket((tick) => {
    setStocks((prev) =>
      prev.map((s) =>
        s.symbol === tick.symbol
          ? { ...s, currentPrice: tick.currentPrice, changePercent: tick.changePercent }
          : s
      )
    );
  });

  // Duplicate items to ensure smooth infinite loop scroll
  const scrollItems = [...stocks, ...stocks, ...stocks];

  return (
    <div className="w-full bg-slate-950/80 border-y border-slate-900/60 overflow-hidden py-2 select-none relative backdrop-blur-sm z-30">
      <div className="flex animate-ticker whitespace-nowrap gap-12 w-max">
        {scrollItems.map((s, idx) => {
          const isUp = s.changePercent >= 0;
          return (
            <div key={`${s.symbol}-${idx}`} className="flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-slate-900/40 transition-colors cursor-pointer">
              <span className="font-bold text-slate-200 text-xs tracking-wide">{s.symbol}</span>
              <span className="font-mono-numbers text-xs text-slate-300 font-medium">
                ${s.currentPrice?.toFixed(2)}
              </span>
              <span
                className={`flex items-center text-[10px] font-semibold font-mono-numbers px-1.5 py-0.5 rounded-md ${
                  isUp
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-red-400 bg-red-500/10'
                }`}
              >
                {isUp ? <ArrowUpRight size={10} className="mr-0.5" /> : <ArrowDownRight size={10} className="mr-0.5" />}
                {isUp ? '+' : ''}{s.changePercent?.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
