import React, { useState, useEffect } from 'react';

function AnimatedCounter({ value, prefix = "", suffix = "" }) {
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    let startVal = displayVal;
    const endVal = value;
    if (startVal === endVal) return;

    const duration = 400;
    const startTime = performance.now();
    let animFrame;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress);
      const current = Math.floor(startVal + (endVal - startVal) * easeProgress);
      setDisplayVal(current);

      if (progress < 1) {
        animFrame = requestAnimationFrame(tick);
      }
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [value]);

  return (
    <span>
      {prefix}
      {displayVal.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}

export default function ROICalculator() {
  const [leadVolume, setLeadVolume] = useState(500);
  const [leadValue, setLeadValue] = useState(5000);
  const [hoursWasted, setHoursWasted] = useState(80);

  // Math equations
  const hoursRecovered = hoursWasted; 
  // 15% estimated lead leakage recovered + ₹450/hr operational labor recovery
  const monthlySavings = Math.floor((leadVolume * leadValue * 0.15) + (hoursWasted * 450));
  const annualSavings = monthlySavings * 12;

  return (
    <section id="roi-calculator" className="section-container relative w-full bg-transparent border-t border-white/10">
      <div className="w-full">
        
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-20 flex flex-col items-center gap-4">
          <span className="text-[10px] md:text-[11px] font-bold tracking-[0.25em] text-[#5E0ED7] uppercase">
            REVENUE RECOVERY
          </span>
          <h2 className="text-3xl md:text-5xl font-normal tracking-tight text-white uppercase">
            ROI CALCULATOR
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Side: Sliders */}
          <div className="col-span-1 lg:col-span-6 p-8 rounded-[24px] border border-white/5 bg-white/[0.01] flex flex-col gap-8">
            
            {/* Input 1 */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold tracking-wider text-gray-300 uppercase">
                  Monthly Lead Volume
                </label>
                <span className="text-xs font-mono text-white bg-white/5 border border-white/10 px-2.5 py-0.5 rounded">
                  {leadVolume.toLocaleString('en-IN')} Leads
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="5000"
                step="50"
                value={leadVolume}
                onChange={(e) => setLeadVolume(Number(e.target.value))}
                className="w-full cursor-pointer cursor-target"
              />
            </div>

            {/* Input 2 */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold tracking-wider text-gray-300 uppercase">
                  Average Lead Value
                </label>
                <span className="text-xs font-mono text-white bg-white/5 border border-white/10 px-2.5 py-0.5 rounded">
                  ₹{leadValue.toLocaleString('en-IN')}
                </span>
              </div>
              <input
                type="range"
                min="500"
                max="50000"
                step="500"
                value={leadValue}
                onChange={(e) => setLeadValue(Number(e.target.value))}
                className="w-full cursor-pointer cursor-target"
              />
            </div>

            {/* Input 3 */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold tracking-wider text-gray-300 uppercase">
                  Monthly Hours Wasted
                </label>
                <span className="text-xs font-mono text-white bg-white/5 border border-white/10 px-2.5 py-0.5 rounded">
                  {hoursWasted} Hours
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={hoursWasted}
                onChange={(e) => setHoursWasted(Number(e.target.value))}
                className="w-full cursor-pointer cursor-target"
              />
            </div>

          </div>

          {/* Right Side: Outputs */}
          <div className="col-span-1 lg:col-span-6 flex flex-col gap-6 w-full">
            
            {/* Output 1: Monthly Savings */}
            <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col justify-between h-[120px]">
              <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                Monthly Savings Potential
              </span>
              <div className="text-3xl font-semibold text-white mt-2 font-mono">
                <AnimatedCounter value={monthlySavings} prefix="₹" />
              </div>
              <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mt-1">
                Estimated overhead + leakage reclaimed
              </span>
            </div>

            {/* Output 2: Annual Savings */}
            <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col justify-between h-[120px]">
              <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                Annual Savings Potential
              </span>
              <div className="text-3xl font-semibold text-white mt-2 font-mono">
                <AnimatedCounter value={annualSavings} prefix="₹" />
              </div>
              <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mt-1">
                Projected twelve-month business savings
              </span>
            </div>

            {/* Output 3: Hours Recovered */}
            <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col justify-between h-[120px]">
              <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                Hours Recovered
              </span>
              <div className="text-3xl font-semibold text-white mt-2 font-mono">
                <AnimatedCounter value={hoursRecovered} suffix=" Hrs / Mo" />
              </div>
              <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mt-1">
                Time redirected to core business operations
              </span>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
