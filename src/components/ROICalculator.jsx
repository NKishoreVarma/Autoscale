import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Save, Check } from 'lucide-react';

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
  const [teamSize, setTeamSize] = useState(15);
  const [hoursLost, setHoursLost] = useState(6); // hours lost per week per employee
  const [leadVolume, setLeadVolume] = useState(250);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Calculations
  // Monthly Hours saved = Team Size * Hours Lost * 4 weeks
  const monthlyHoursSaved = useMemo(() => teamSize * hoursLost * 4, [teamSize, hoursLost]);
  
  // Labor Rate = ₹450 / hour. Monthly Savings = hours saved * ₹450
  const monthlySavings = useMemo(() => monthlyHoursSaved * 450, [monthlyHoursSaved]);
  const annualSavings = useMemo(() => monthlySavings * 12, [monthlySavings]);
  
  // Revenue Opportunity = 15% lead leakage recovered * average contract value ₹5000 * leadVolume
  const revenueOpportunity = useMemo(() => Math.floor(leadVolume * 0.15 * 5000), [leadVolume]);

  const handleSaveReport = useCallback(async () => {
    setSaving(true);
    try {
      await addDoc(collection(db, 'roiCalculations'), {
        teamSize,
        hoursLost,
        leadVolume,
        monthlySavings,
        annualSavings,
        revenueOpportunity,
        createdAt: serverTimestamp()
      });
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("Error saving ROI report:", err);
      setSaving(false);
    }
  }, [teamSize, hoursLost, leadVolume, monthlySavings, annualSavings, revenueOpportunity]);

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
            
            {/* Input 1: Team Size */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold tracking-wider text-gray-300 uppercase">
                  Team Size (FTEs)
                </label>
                <span className="text-xs font-mono text-white bg-white/5 border border-white/10 px-2.5 py-0.5 rounded">
                  {teamSize} Members
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="250"
                step="1"
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
                className="w-full cursor-pointer cursor-target"
              />
            </div>

            {/* Input 2: Weekly Hours Wasted per FTE */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold tracking-wider text-gray-300 uppercase">
                  Weekly Hours Wasted / FTE
                </label>
                <span className="text-xs font-mono text-white bg-white/5 border border-white/10 px-2.5 py-0.5 rounded">
                  {hoursLost} Hours / Week
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="40"
                step="1"
                value={hoursLost}
                onChange={(e) => setHoursLost(Number(e.target.value))}
                className="w-full cursor-pointer cursor-target"
              />
            </div>

            {/* Input 3: Monthly Lead Volume */}
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
                min="10"
                max="2500"
                step="10"
                value={leadVolume}
                onChange={(e) => setLeadVolume(Number(e.target.value))}
                className="w-full cursor-pointer cursor-target"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveReport}
              disabled={saving}
              className="mt-4 w-full bg-white text-black text-xs font-bold tracking-wider rounded-lg py-3 hover:bg-gray-100 transition uppercase flex items-center justify-center gap-2"
            >
              {saved ? <Check className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4 text-[#5E0ED7]" />}
              <span>{saved ? 'Calculation Saved to database' : saving ? 'Saving...' : 'Save ROI Report'}</span>
            </button>

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
                Labor recovery valued at ₹450/hour
              </span>
            </div>

            {/* Output 2: Annual Savings */}
            <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col justify-between h-[120px]">
              <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                Annual Savings Potential
              </span>
              <div className="text-3xl font-semibold text-[#5E0ED7] mt-2 font-mono">
                <AnimatedCounter value={annualSavings} prefix="₹" />
              </div>
              <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mt-1">
                Projected twelve-month operational recovery
              </span>
            </div>

            {/* Output 3: Revenue Opportunity */}
            <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col justify-between h-[120px]">
              <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                Revenue Opportunity
              </span>
              <div className="text-3xl font-semibold text-white mt-2 font-mono">
                <AnimatedCounter value={revenueOpportunity} prefix="₹" />
              </div>
              <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mt-1">
                Value of reclaiming 15% lead leakage
              </span>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
