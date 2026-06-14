import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const DEFAULT_CASE_STUDIES = [
  {
    industry: "Real Estate",
    client: "Prop-Holdings Group",
    before: "4 Hour Response Time",
    after: "15 Second Response Time",
    result: "31% More Qualified Leads",
    order: 0
  },
  {
    industry: "Healthcare",
    client: "Smile-Design Clinics",
    before: "60% Missed Calls",
    after: "100% Inbound Ingestion",
    result: "+35% Appointment Bookings",
    order: 1
  },
  {
    industry: "Ecommerce",
    client: "Vintage-Threads Apparel",
    before: "78% Cart Abandonment",
    after: "90s Follow-up Trigger",
    result: "18% Revenue Reclaimed",
    order: 2
  }
];

export default function CaseStudies() {
  const [caseStudies, setCaseStudies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'caseStudies'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, async (snap) => {
      if (snap.empty) {
        console.log("[CaseStudies] No case studies found. Seeding defaults...");
        for (const cs of DEFAULT_CASE_STUDIES) {
          try {
            await addDoc(collection(db, 'caseStudies'), {
              ...cs,
              createdAt: serverTimestamp()
            });
          } catch (e) {
            console.error("Error seeding case study:", e);
          }
        }
      } else {
        setCaseStudies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex justify-center items-center">
        <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <section id="case-studies" className="section-container relative w-full bg-transparent border-t border-white/10">
      <div className="w-full">
        
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-24 flex flex-col items-center gap-4">
          <span className="text-[10px] md:text-[11px] font-bold tracking-[0.25em] text-[#5E0ED7] uppercase">
            AUDITED PERFORMANCE
          </span>
          <h2 className="text-3xl md:text-5xl font-normal tracking-tight text-white uppercase">
            CASE STUDIES
          </h2>
        </div>

        {/* Rows List */}
        <div className="flex flex-col gap-6 w-full">
          {caseStudies.map((cs) => (
            <div
              key={cs.id}
              className="cursor-target relative p-8 md:p-10 rounded-[24px] border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] hover:border-[#5E0ED7]/25 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(94,14,215,0.06)] transition-all duration-300 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 group overflow-hidden"
              style={{
                boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)'
              }}
            >
              {/* Left Side: Client Info */}
              <div className="flex flex-col min-w-[250px]">
                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                  {cs.industry}
                </span>
                <h3 className="text-xl md:text-2xl font-normal text-white mt-1 uppercase">
                  {cs.client}
                </h3>
              </div>

              {/* Right Side: Before / After / Result Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-grow">
                {/* Before */}
                <div className="flex flex-col border-l border-white/5 pl-4">
                  <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">
                    BEFORE (MANUAL)
                  </span>
                  <span className="text-base md:text-lg font-light text-gray-300 mt-1 uppercase">
                    {cs.before}
                  </span>
                </div>

                {/* After */}
                <div className="flex flex-col border-l border-white/5 pl-4">
                  <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">
                    AFTER (AUTOMATED)
                  </span>
                  <span className="text-base md:text-lg font-light text-white mt-1 uppercase">
                    {cs.after}
                  </span>
                </div>

                {/* Result */}
                <div className="flex flex-col border-l border-white/5 pl-4">
                  <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">
                    EXPECTED RESULT
                  </span>
                  <span className="text-base md:text-lg font-bold text-white mt-1 uppercase">
                    {cs.result}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
