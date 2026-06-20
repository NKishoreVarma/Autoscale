import React from 'react';

// Reusable pulsing bar
export function SkeletonPulse({ className = '' }) {
  return (
    <div className={`animate-pulse bg-white/5 rounded ${className}`} />
  );
}

// Table layout placeholder
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full flex flex-col gap-4 border border-white/5 bg-white/[0.01] rounded-xl p-6">
      {/* Header Row */}
      <div className="flex gap-4 border-b border-white/5 pb-4">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonPulse key={`h-${i}`} className="h-4 flex-grow" />
        ))}
      </div>
      {/* Data Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`r-${r}`} className="flex gap-4 items-center py-3">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonPulse key={`c-${r}-${c}`} className="h-3.5 flex-grow" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Stats or Grid Card placeholder
export function CardSkeleton({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col justify-between h-[150px] relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <SkeletonPulse className="h-3 w-1/3" />
            <SkeletonPulse className="h-5 w-5 rounded-md" />
          </div>
          <SkeletonPulse className="h-8 w-1/2 my-2" />
          <SkeletonPulse className="h-2.5 w-3/4" />
        </div>
      ))}
    </div>
  );
}

// Form fields placeholders
export function FormSkeleton({ fields = 4 }) {
  return (
    <div className="flex flex-col gap-5 w-full p-6 border border-white/5 bg-white/[0.01] rounded-xl">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <SkeletonPulse className="h-3 w-1/4" />
          <SkeletonPulse className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <div className="flex justify-end gap-3 mt-4">
        <SkeletonPulse className="h-9 w-24 rounded-lg" />
        <SkeletonPulse className="h-9 w-32 rounded-lg" />
      </div>
    </div>
  );
}

// Complete Dashboard skeleton loader
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-10 w-full animate-pulse">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <SkeletonPulse className="h-3 w-28" />
        <SkeletonPulse className="h-8 w-48" />
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-6 rounded-xl border border-white/5 bg-white/[0.01] h-[150px] flex flex-col justify-between">
            <div className="flex justify-between">
              <SkeletonPulse className="h-3 w-1/3" />
              <SkeletonPulse className="h-5 w-5" />
            </div>
            <SkeletonPulse className="h-8 w-1/2" />
            <SkeletonPulse className="h-2.5 w-2/3" />
          </div>
        ))}
      </div>
      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] h-[350px] flex flex-col gap-4">
          <SkeletonPulse className="h-4 w-1/3 border-b border-white/5 pb-2" />
          <SkeletonPulse className="h-full w-full" />
        </div>
        <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] h-[350px] flex flex-col gap-4">
          <SkeletonPulse className="h-4 w-1/3 border-b border-white/5 pb-2" />
          <SkeletonPulse className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
