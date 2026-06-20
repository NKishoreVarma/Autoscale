import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function EmptyState({
  title = 'No records found',
  description = 'Get started by creating a new entry in this category.',
  icon: Icon = HelpCircle,
  actionLabel = '',
  onActionClick = null
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 max-w-md mx-auto rounded-xl border border-white/5 bg-white/[0.01] backdrop-blur-md shadow-2xl relative overflow-hidden">
      {/* Decorative subtle ambient lights inside card */}
      <div className="absolute -top-10 -left-10 w-24 h-24 bg-[#5E0ED7]/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Icon Frame */}
      <div className="w-14 h-14 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.5)] mb-6 text-purple-400">
        <Icon className="w-6 h-6 stroke-[1.5]" />
      </div>

      {/* Heading & Subtext */}
      <h3 className="text-sm font-semibold tracking-widest text-white uppercase mb-2">
        {title}
      </h3>
      <p className="text-xs leading-relaxed text-gray-400 font-light max-w-sm mb-6">
        {description}
      </p>

      {/* Recommended CTA button */}
      {actionLabel && onActionClick && (
        <button
          onClick={onActionClick}
          className="relative group overflow-hidden bg-white text-black hover:text-white font-semibold tracking-wider text-[11px] rounded-lg px-6 py-2.5 transition duration-300 uppercase shadow-lg hover:shadow-[#5E0ED7]/30 flex items-center gap-2"
        >
          {/* Slide-over background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#5E0ED7] to-purple-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out -z-10" />
          <span className="relative z-10">{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
