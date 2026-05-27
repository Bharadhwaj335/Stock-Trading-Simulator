import React from 'react';

export default function WinRateGauge({ winRate = 0 }) {
  const radius = 70;
  const stroke = 10;
  const normalizedRadius = radius - stroke * 1.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (winRate / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="relative w-36 h-36 flex items-center justify-center">
        {/* Glow element */}
        <div className="absolute inset-0 bg-emerald-500/5 rounded-full filter blur-[20px] pointer-events-none" />

        <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" /> {/* cyan-400 */}
              <stop offset="100%" stopColor="#10b981" /> {/* emerald-500 */}
            </linearGradient>
          </defs>
          {/* Background circle */}
          <circle
            stroke="#1e293b" // slate-800
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="stroke-slate-800/80"
          />
          {/* Foreground progress circle */}
          <circle
            stroke="url(#gaugeGradient)"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease-in-out' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>

        {/* Center label text */}
        <div className="absolute flex flex-col items-center justify-center select-none text-center">
          <span className="text-2xl font-black font-mono-numbers text-slate-100 tracking-tight">
            {winRate?.toFixed(1)}%
          </span>
          <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mt-0.5">Win Rate</span>
        </div>
      </div>
    </div>
  );
}
