import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatsCard({ title, value, icon: Icon, description, trend, trendDirection = 'neutral' }) {
  const trendConfig = {
    up: {
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/20',
      border: 'border-emerald-500/20',
      icon: TrendingUp
    },
    down: {
      color: 'text-rose-400',
      bg: 'bg-rose-950/20',
      border: 'border-rose-500/20',
      icon: TrendingDown
    },
    neutral: {
      color: 'text-gray-400',
      bg: 'bg-white/5',
      border: 'border-white/10',
      icon: Minus
    }
  };

  const activeTrend = trendConfig[trendDirection] || trendConfig.neutral;
  const TrendIcon = activeTrend.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col justify-between h-[150px] relative overflow-hidden"
      style={{
        boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)'
      }}
    >
      {/* Top row: title + icon */}
      <div className="flex justify-between items-start">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          {title}
        </span>
        {Icon && <Icon className="w-5 h-5 text-gray-500" />}
      </div>

      {/* Value + Trend */}
      <div className="flex items-end gap-3">
        <span className="text-3xl font-semibold tracking-tight text-white">
          {value}
        </span>
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold tracking-wider ${activeTrend.color} ${activeTrend.bg} ${activeTrend.border} mb-1`}>
            <TrendIcon className="w-3 h-3" />
            <span>{trend}</span>
          </div>
        )}
      </div>

      {/* Description */}
      {description && (
        <span className="text-[10px] text-gray-500 tracking-wide font-light">
          {description}
        </span>
      )}
    </motion.div>
  );
}
