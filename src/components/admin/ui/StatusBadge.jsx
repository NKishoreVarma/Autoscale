import React from 'react';

const DEFAULT_COLOR_MAP = {
  'Active': { border: 'border-emerald-500/20', text: 'text-emerald-400', bg: 'bg-emerald-950/10' },
  'New': { border: 'border-amber-500/20', text: 'text-amber-400', bg: 'bg-amber-950/10' },
  'Won': { border: 'border-emerald-500/20', text: 'text-emerald-400', bg: 'bg-emerald-950/10' },
  'Lost': { border: 'border-rose-500/20', text: 'text-rose-400', bg: 'bg-rose-950/10' },
  'Paused': { border: 'border-orange-500/20', text: 'text-orange-400', bg: 'bg-orange-950/10' },
  'Completed': { border: 'border-blue-500/20', text: 'text-blue-400', bg: 'bg-blue-950/10' },
  'Paid': { border: 'border-emerald-500/20', text: 'text-emerald-400', bg: 'bg-emerald-950/10' },
  'Pending': { border: 'border-amber-500/20', text: 'text-amber-400', bg: 'bg-amber-950/10' },
  'Overdue': { border: 'border-rose-500/20', text: 'text-rose-400', bg: 'bg-rose-950/10' },
  'Cancelled': { border: 'border-gray-500/20', text: 'text-gray-400', bg: 'bg-gray-950/10' },
  'Planning': { border: 'border-violet-500/20', text: 'text-violet-400', bg: 'bg-violet-950/10' },
  'Building': { border: 'border-blue-500/20', text: 'text-blue-400', bg: 'bg-blue-950/10' },
  'Testing': { border: 'border-amber-500/20', text: 'text-amber-400', bg: 'bg-amber-950/10' },
  'Deployment': { border: 'border-purple-500/20', text: 'text-purple-400', bg: 'bg-purple-950/10' },
  'Live': { border: 'border-emerald-500/20', text: 'text-emerald-400', bg: 'bg-emerald-950/10' },
  'Maintenance': { border: 'border-cyan-500/20', text: 'text-cyan-400', bg: 'bg-cyan-950/10' },
  default: { border: 'border-white/10', text: 'text-gray-300', bg: 'bg-white/5' }
};

const SIZE_CLASSES = {
  sm: 'text-[9px] px-2.5 py-0.5',
  md: 'text-[10px] px-3 py-1'
};

export default function StatusBadge({ status, colorMap, size = 'sm' }) {
  const mergedMap = { ...DEFAULT_COLOR_MAP, ...(colorMap || {}) };
  const colors = mergedMap[status] || mergedMap.default;
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.sm;

  return (
    <span
      className={`font-bold tracking-widest rounded border uppercase inline-block ${sizeClass} ${colors.border} ${colors.text} ${colors.bg}`}
    >
      {status || 'Unknown'}
    </span>
  );
}
