import React from 'react';

export default function CTA() {
  const handleOpenModal = (message = '') => {
    window.dispatchEvent(new CustomEvent('open-lead-modal', {
      detail: { service: 'Custom Systems', message }
    }));
  };

  return (
    <section id="cta" className="section-container relative w-full bg-transparent border-t border-white/10 text-center">
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none -z-10" />

      {/* Monochromatic Aurora Glow */}
      <div className="aurora-bg absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 pointer-events-none" />

      <div className="w-full flex flex-col items-center gap-8">
        
        {/* Eyebrow */}
        <span className="text-[10px] md:text-[11px] font-bold tracking-[0.25em] text-[#5E0ED7] uppercase">
          OPERATIONAL DECOUPLING
        </span>

        {/* Headline */}
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-normal leading-[1.15] text-white uppercase tracking-tight max-w-3xl">
          STOP LOSING REVENUE <br />
          TO MANUAL WORK.
        </h2>

        {/* Subheadline */}
        <p className="text-sm md:text-base text-gray-300 max-w-2xl leading-relaxed font-light">
          Book a free automation audit and discover where your business is leaking time, leads, and revenue.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-6 w-full sm:w-auto">
          <button
            onClick={() => handleOpenModal('Book Audit request from CTA')}
            className="w-full sm:w-auto px-8 py-3 rounded-lg bg-white text-black font-medium text-sm hover:bg-[#5E0ED7] hover:text-white transition duration-200 active:scale-[0.98] cursor-target"
          >
            Book Audit
          </button>

          <button
            onClick={() => handleOpenModal('Schedule Call request from CTA')}
            className="w-full sm:w-auto px-8 py-3 rounded-lg liquid-glass border border-white/20 text-white font-medium text-sm hover:bg-white hover:text-black transition duration-200 active:scale-[0.98] cursor-target"
          >
            Schedule Call
          </button>
        </div>

        {/* Risk Deflector Tag */}
        <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mt-4 block">
          No Retainers &bull; No Setup Fees &bull; Result Guaranteed
        </span>

      </div>
    </section>
  );
}
