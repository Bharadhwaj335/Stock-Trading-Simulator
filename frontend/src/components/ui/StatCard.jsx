import React from 'react';
import { motion } from 'framer-motion';

export default function StatCard({ label, value, subtext, icon: Icon, trend, color = 'emerald' }) {
  const isUp = trend >= 0;
  
  const colorMap = {
    emerald: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      glow: 'glow-emerald',
    },
    red: {
      text: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      glow: 'glow-red',
    },
    blue: {
      text: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      glow: '',
    },
    cyan: {
      text: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      glow: '',
    },
    amber: {
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      glow: '',
    }
  };

  const currentColors = colorMap[color] || colorMap.emerald;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`glass-card rounded-2xl border-slate-900/80 p-5 flex items-center justify-between relative overflow-hidden backdrop-blur-md ${currentColors.glow}`}
    >
      {/* Background radial accent glow */}
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full filter blur-[40px] opacity-15 pointer-events-none ${currentColors.bg}`} />

      <div className="space-y-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <h3 className="text-xl font-extrabold text-slate-100 tracking-tight font-mono-numbers">
          {value}
        </h3>
        {subtext && (
          <div className="flex items-center gap-1.5 mt-1">
            {trend !== undefined && (
              <span className={`text-[10px] font-bold font-mono-numbers px-1.5 py-0.5 rounded ${
                isUp ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
              }`}>
                {isUp ? '+' : ''}{trend}%
              </span>
            )}
            <span className="text-[10px] text-slate-500 font-semibold">{subtext}</span>
          </div>
        )}
      </div>

      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${currentColors.border} ${currentColors.bg} ${currentColors.text} shadow-inner`}>
        <Icon size={18} />
      </div>
    </motion.div>
  );
}
