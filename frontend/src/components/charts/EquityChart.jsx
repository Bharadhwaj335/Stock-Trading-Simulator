import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

export default function EquityChart({ data = [] }) {
  // Fallback if no trades are made yet
  const chartData = data.length > 0 
    ? data 
    : [
        { date: 'Initial', cashBalance: 30000 },
        { date: 'Today', cashBalance: 30000 }
      ];

  const minVal = Math.min(...chartData.map(d => d.cashBalance)) * 0.99;
  const maxVal = Math.max(...chartData.map(d => d.cashBalance)) * 1.01;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="glass-card rounded-xl border-slate-800 p-3 shadow-xl backdrop-blur-md text-xs">
          <p className="text-slate-400 font-semibold mb-1">{item.date}</p>
          <p className="font-mono-numbers text-sm font-bold text-emerald-400">
            ${item.cashBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          {item.tradeSymbol && (
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
              Traded: <span className={item.tradeType === 'buy' ? 'text-cyan-400' : 'text-red-400'}>{item.tradeType}</span> {item.tradeSymbol}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full min-h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date" 
            stroke="#475569" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            dy={10}
          />
          <YAxis 
            stroke="#475569" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            domain={[minVal, maxVal]}
            tickFormatter={(v) => `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="cashBalance" 
            stroke="#10b981" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorEquity)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
