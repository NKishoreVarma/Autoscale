import React from 'react';

const FLOW_ROWS = [
  {
    leak: "Inbound Lead Arrives",
    fix: "Captured instantly in CRM database"
  },
  {
    leak: "After-Hours Inquiries Missed",
    fix: "Voice AI Receptionist books 24/7"
  },
  {
    leak: "Delayed Lead Response > 5m",
    fix: "90s Outbound Callback triggers"
  },
  {
    leak: "No Ongoing Client Follow-Up",
    fix: "WhatsApp Nurture pipeline fires"
  }
];

export default function RevenueLeakMap() {
  return (
    <section id="leak-map" className="section-container relative w-full bg-transparent border-t border-white/10">
      <div className="w-full">
        
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-24 flex flex-col items-center gap-4">
          <span className="text-[10px] md:text-[11px] font-bold tracking-[0.25em] text-[#5E0ED7] uppercase">
            REVENUE LEAK AUDIT
          </span>
          <h2 className="text-3xl md:text-5xl font-normal tracking-tight text-white uppercase">
            REVENUE LEAK MAP
          </h2>
          <p className="text-sm text-gray-300 font-light max-w-lg mt-2">
            Every step in your manual lead pipeline leaks potential revenue. Here is how our automated systems bridge the gaps.
          </p>
        </div>

        {/* Rows Flowchart */}
        <div className="flex flex-col gap-10 lg:gap-8 max-w-4xl mx-auto">
          {FLOW_ROWS.map((row, idx) => (
            <div 
              key={idx}
              className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-8 w-full"
            >
              
              {/* Left Column: Leak Card */}
              <div 
                className="cursor-target w-full lg:w-[42%] p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col justify-center min-h-[90px]"
                style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.03)' }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse" />
                  <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">
                    LEAK {idx + 1}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-300 uppercase tracking-wide">
                  {row.leak}
                </p>
              </div>

              {/* Center Connection: SVG Dashed Line */}
              <div className="w-full lg:w-[16%] flex lg:flex-col items-center justify-center min-h-[30px] lg:min-h-0">
                {/* Horizontal line for desktop */}
                <svg className="hidden lg:block w-full h-8" viewBox="0 0 100 20" fill="none">
                  <path 
                    d="M 0 10 Q 50 10 100 10" 
                    stroke="rgba(255, 255, 255, 0.2)" 
                    strokeWidth="1.5" 
                    className="animate-dash"
                  />
                </svg>
                {/* Vertical line for mobile */}
                <svg className="block lg:hidden h-8 w-6" viewBox="0 0 20 100" fill="none">
                  <path 
                    d="M 10 0 Q 10 50 10 100" 
                    stroke="rgba(255, 255, 255, 0.2)" 
                    strokeWidth="1.5" 
                    className="animate-dash"
                  />
                </svg>
              </div>

              {/* Right Column: Fix Card */}
              <div 
                className="cursor-target w-full lg:w-[42%] p-6 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col justify-center min-h-[90px]"
                style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span className="text-[9px] font-bold tracking-widest text-white/50 uppercase">
                    AUTOSCALE FIX
                  </span>
                </div>
                <p className="text-sm font-medium text-white uppercase tracking-wide">
                  {row.fix}
                </p>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
