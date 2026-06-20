import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const DEFAULT_CASE_STUDIES = [
  {
    title: "WhatsApp Qualification Integration",
    industry: "Real Estate",
    clientName: "Prop-Holdings Group",
    problem: "Manual scheduling and 4-hour delay in qualifying incoming customer inquiries.",
    solution: "Deployed custom WhatsApp responder with real-time slot booking integrations.",
    result: "15 second response latency & zero missed inquiries.",
    roi: "31% More Qualified Leads",
    published: true,
    order: 0
  },
  {
    title: "AI Patient Ingestion Bot",
    industry: "Healthcare",
    clientName: "Smile-Design Clinics",
    problem: "60% of inbound patient phone calls went unanswered during peak operating hours.",
    solution: "Integrated conversational AI agent handling multilingual appointment bookings.",
    result: "100% inbound ingestion with zero manual staff load.",
    roi: "+35% Appointment Bookings",
    published: true,
    order: 1
  },
  {
    title: "Cart Abandonment Sequence",
    industry: "Ecommerce",
    clientName: "Vintage-Threads Apparel",
    problem: "78% cart abandonment rate on checkout without automated follow-ups.",
    solution: "Deployed 90-second SMS/WhatsApp recovery pipelines with dynamic discount triggers.",
    result: "18% abandoned cart revenue reclaimed automatically.",
    roi: "18% Revenue Reclaimed",
    published: true,
    order: 2
  }
];

export default function CaseStudies() {
  const [caseStudies, setCaseStudies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'caseStudies'));
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
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Filter published items and sort by order in-memory
        const active = list
          .filter(cs => cs.published !== false)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        setCaseStudies(active);
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
              className="cursor-target relative p-8 md:p-10 rounded-[24px] border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] hover:border-[#5E0ED7]/25 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(94,14,215,0.06)] transition-all duration-300 flex flex-col lg:grid lg:grid-cols-12 items-start lg:items-center gap-8 group overflow-hidden"
              style={{
                boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)'
              }}
            >
              {/* Sector & Client Info (Cols 1-4) */}
              <div className="lg:col-span-4 flex flex-col">
                <span className="text-[9px] font-bold tracking-widest text-[#5E0ED7] uppercase">
                  {cs.industry}
                </span>
                <h3 className="text-xl font-normal text-white mt-1 uppercase">
                  {cs.title || 'Automation Integration'}
                </h3>
                <span className="text-[10px] text-gray-500 font-mono mt-1 uppercase">
                  CLIENT: {cs.clientName || cs.client || 'Prop-Holdings Group'}
                </span>
              </div>

              {/* Operations & Results Grid (Cols 5-12) */}
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 w-full lg:border-l lg:border-white/5 lg:pl-8">
                {/* Problem */}
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold tracking-widest text-gray-500 uppercase">
                    Challenge
                  </span>
                  <p className="text-[11px] text-gray-300 leading-relaxed mt-1 font-light normal-case">
                    {cs.problem || cs.before || 'Manual scheduling bottleneck.'}
                  </p>
                </div>

                {/* Solution */}
                <div className="flex flex-col border-l border-white/5 pl-4 sm:pl-0 sm:border-l-0 md:border-l md:pl-4">
                  <span className="text-[8px] font-bold tracking-widest text-gray-500 uppercase">
                    Engine
                  </span>
                  <p className="text-[11px] text-gray-300 leading-relaxed mt-1 font-light normal-case">
                    {cs.solution || cs.after || 'Custom integration setup.'}
                  </p>
                </div>

                {/* Result */}
                <div className="flex flex-col border-l border-white/5 pl-4">
                  <span className="text-[8px] font-bold tracking-widest text-gray-500 uppercase">
                    Impact
                  </span>
                  <p className="text-[11px] text-gray-300 leading-relaxed mt-1 font-light normal-case">
                    {cs.result || 'Successful deployment.'}
                  </p>
                </div>

                {/* ROI */}
                <div className="flex flex-col border-l border-white/5 pl-4">
                  <span className="text-[8px] font-bold tracking-widest text-[#5E0ED7] uppercase">
                    Net Yield / ROI
                  </span>
                  <span className="text-sm font-bold text-white mt-1 uppercase">
                    {cs.roi || cs.result || 'N/A'}
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
