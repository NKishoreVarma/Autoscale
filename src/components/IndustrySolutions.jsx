import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const DEFAULT_INDUSTRIES = [
  {
    title: "Healthcare",
    leak: "Over 60% of after-hours calls and patient inquiries are missed.",
    metricPrefix: "+",
    metricValue: 35,
    metricSuffix: "% appointments booked",
    order: 0
  },
  {
    title: "Real Estate",
    leak: "Agents spend 18+ hours/week calling unqualified buyer leads.",
    metricPrefix: "Lead response cut to ",
    metricValue: 90,
    metricSuffix: "s",
    order: 1
  },
  {
    title: "Education",
    leak: "Admissions flooded by duplicate fee FAQs and incomplete application drop-offs.",
    metricPrefix: "",
    metricValue: 75,
    metricSuffix: "% FAQs deflected",
    order: 2
  },
  {
    title: "Ecommerce",
    leak: "Cart abandonment rate hovers at 70% with zero automated follow-up.",
    metricPrefix: "",
    metricValue: 18,
    metricSuffix: "% cart revenue reclaimed",
    order: 3
  },
  {
    title: "Agencies",
    leak: "Founders spend 12+ hours/week compiling reports and syncing platforms manually.",
    metricPrefix: "Report times cut to ",
    metricValue: 30,
    metricSuffix: "s",
    order: 4
  },
  {
    title: "Legal",
    leak: "Assistant intake forms ingestion delay causes prospective case drop-offs.",
    metricPrefix: "-",
    metricValue: 40,
    metricSuffix: "% case onboarding time",
    order: 5
  }
];

function AnimatedMetric({ prefix, value, suffix, isHovered }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (isHovered) {
      let animationFrameId;
      const startTime = performance.now();
      const duration = 1200; // 1.2s smooth count-up duration

      const animate = (timestamp) => {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-out quad formula
        const easeProgress = progress * (2 - progress);
        const currentValue = Math.round(easeProgress * value);
        setCurrent(currentValue);

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate);
        }
      };

      animationFrameId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationFrameId);
    } else {
      setCurrent(0);
    }
  }, [isHovered, value]);

  return (
    <span className="text-xs font-semibold text-white tracking-wider uppercase font-mono">
      {prefix}
      {current}
      {suffix}
    </span>
  );
}

export default function IndustrySolutions() {
  const [industries, setIndustries] = useState([]);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'industries'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, async (snap) => {
      if (snap.empty) {
        console.log("[IndustrySolutions] No industries found. Seeding defaults...");
        for (const ind of DEFAULT_INDUSTRIES) {
          try {
            await addDoc(collection(db, 'industries'), {
              ...ind,
              createdAt: serverTimestamp()
            });
          } catch (e) {
            console.error("Error seeding industry:", e);
          }
        }
      } else {
        setIndustries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleOpenModal = () => {
    window.dispatchEvent(new CustomEvent('open-lead-modal', {
      detail: { service: 'Custom Systems', message: 'Inquiry from Industries Section' }
    }));
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center items-center">
        <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <section id="industries" className="section-container relative w-full bg-transparent border-t border-white/10">
      <div className="w-full flex flex-col items-center">
        
        {/* Section Title */}
        <div className="text-center max-w-2xl mb-20 flex flex-col items-center gap-4">
          <span className="text-[10px] md:text-[11px] font-bold tracking-[0.25em] text-[#5E0ED7] uppercase">
            SECTOR PERFORMANCE AUDITS
          </span>
          <h2 className="text-3xl md:text-5xl font-normal tracking-tight text-white uppercase">
            INDUSTRIES WE OPTIMIZE
          </h2>
        </div>

        {/* 6 Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mb-16">
          {industries.map((ind, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <div
                key={ind.id}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-target relative p-8 rounded-[24px] border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] hover:border-[#5E0ED7]/25 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(94,14,215,0.06)] transition-all duration-300 flex flex-col justify-between h-[280px] group overflow-hidden"
                style={{
                  boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)'
                }}
              >
                {/* Subtle Purple Laser Beam at the Top */}
                <div className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-[#5E0ED7] to-transparent w-full scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center" />

                {/* Soft Radial Ambient Glow behind */}
                <div className="absolute inset-0 bg-[#5E0ED7]/[0.01] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none blur-2xl" />

                <div>
                  <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">
                    SECTOR SPEC
                  </span>
                  <h3 className="text-lg md:text-xl font-medium text-white mt-1 uppercase">
                    {ind.title}
                  </h3>
                </div>

                <div className="my-2">
                  <span className="text-[9px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                    IDENTIFIED BOTTLENECK
                  </span>
                  <p className="text-sm text-gray-300 leading-relaxed font-light">
                    {ind.leak}
                  </p>
                </div>

                <div className="border-t border-white/5 pt-4 flex justify-between items-center">
                  <span className="text-[9px] font-bold tracking-widest text-gray-400 uppercase">
                    EXPECTED IMPACT
                  </span>
                  <AnimatedMetric
                    prefix={ind.metricPrefix}
                    value={ind.metricValue}
                    suffix={ind.metricSuffix}
                    isHovered={isHovered}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Single CTA */}
        <div>
          <button
            onClick={handleOpenModal}
            className="cursor-target liquid-glass border border-white/20 text-white px-8 py-3 rounded-lg text-sm font-medium hover:bg-white hover:text-black transition duration-200 active:scale-[0.98]"
          >
            Book Industry Audit
          </button>
        </div>

      </div>
    </section>
  );
}
