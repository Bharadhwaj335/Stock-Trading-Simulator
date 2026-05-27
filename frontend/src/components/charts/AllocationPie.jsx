import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';

const COLORS = [
  '#10b981', // emerald-500
  '#06b6d4', // cyan-500
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#ec4899', // rose-500
  '#14b8a6', // teal-500
];

export default function AllocationPie({ data = [], nameKey = 'sector', valueKey = 'value' }) {
  const chartData = data.length > 0
    ? data
    : [{ [nameKey]: 'Cash Only', [valueKey]: 100, percent: 100 }];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="glass-card rounded-xl border-slate-800 p-3 shadow-xl backdrop-blur-md text-xs">
          <p className="font-bold text-slate-100 mb-1">{item[nameKey]}</p>
          <p className="font-mono-numbers font-bold text-emerald-400">
            ${item[valueKey]?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          {item.percent !== undefined && (
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Allocation: {item.percent?.toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full min-h-[220px] flex flex-col sm:flex-row items-center justify-between gap-6">
      {/* Donut Chart Container */}
      <div className="w-full sm:w-1/2 h-[180px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={3}
              dataKey={valueKey}
              nameKey={nameKey}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                  stroke="rgba(15, 23, 42, 0.6)"
                  strokeWidth={2}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Holdings</span>
          <span className="text-xs font-extrabold text-slate-200">Weights</span>
        </div>
      </div>

      {/* Curated Legend list */}
      <div className="w-full sm:w-1/2 flex flex-col gap-2.5 max-h-[180px] overflow-y-auto pr-1">
        {chartData.map((entry, index) => {
          const color = COLORS[index % COLORS.length];
          const name = entry[nameKey];
          const pct = entry.percent ?? 100;
          return (
            <div key={index} className="flex items-center justify-between text-xs hover:bg-slate-900/30 p-1.5 rounded-lg transition-colors">
              <div className="flex items-center gap-2 truncate pr-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="font-bold text-slate-300 truncate">{name}</span>
              </div>
              <span className="font-mono-numbers font-semibold text-slate-400 text-[10px] flex-shrink-0">
                {pct?.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
