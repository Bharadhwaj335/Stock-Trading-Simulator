import React from 'react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

export default function PnLBarChart({ data = [] }) {
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const isProfit = item.pnl >= 0;
      return (
        <div className="glass-card rounded-xl border-slate-800 p-3 shadow-xl backdrop-blur-md text-xs">
          <p className="text-slate-400 font-semibold mb-1">{item.month} {item.year}</p>
          <p className={`font-mono-numbers text-sm font-bold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
            {isProfit ? '+' : ''}${item.pnl?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 font-semibold mt-1">
            Total Sells: {item.trades}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full min-h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <XAxis 
            dataKey="month" 
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
            tickFormatter={(v) => `${v >= 0 ? '+' : ''}$${v}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <ReferenceLine y={0} stroke="#334155" strokeWidth={1.5} />
          <Bar dataKey="pnl">
            {data.map((entry, index) => {
              const isProfit = entry.pnl >= 0;
              return (
                <Cell 
                  key={`cell-${index}`} 
                  fill={isProfit ? '#10b981' : '#ef4444'} 
                  fillOpacity={0.85}
                  radius={isProfit ? [4, 4, 0, 0] : [0, 0, 4, 4]}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
