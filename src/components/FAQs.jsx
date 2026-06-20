import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

const DEFAULT_FAQS = [
  {
    question: "What is AutoScale and how does it work?",
    answer: "AutoScale is an autonomous business operating system and automation agency. We build cognitive AI agents, WhatsApp workflows, and CRM integrations to eliminate manual bottlenecks and reclaim lost revenue.",
    isVisible: true,
    order: 0
  },
  {
    question: "How long does a typical system integration take?",
    answer: "Most baseline integrations (WhatsApp bot setups, CRM triggers) deploy within 7 to 14 days. Custom systems and advanced agents take up to 21 days from audit to handover.",
    isVisible: true,
    order: 1
  },
  {
    question: "Is my business data secure with AutoScale?",
    answer: "Absolutely. All integrations utilize production-grade API nodes, and we enforce strict Firebase security clearance rules to ensure client data isolation at all times.",
    isVisible: true,
    order: 2
  }
];

export default function FAQs() {
  const [faqs, setFaqs] = useState([]);
  const [openIdx, setOpenIdx] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'faqs'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, async (snap) => {
      if (snap.empty) {
        console.log("[FAQs] No FAQs found. Seeding defaults...");
        for (const f of DEFAULT_FAQS) {
          try {
            await addDoc(collection(db, 'faqs'), {
              ...f,
              createdAt: serverTimestamp()
            });
          } catch (e) {
            console.error("Error seeding faq:", e);
          }
        }
      } else {
        setFaqs(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(f => f.isVisible !== false));
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <section id="faqs" className="section-container relative w-full bg-transparent border-t border-white/10">
      <div className="w-full max-w-4xl mx-auto">
        {/* Title */}
        <div className="text-center mb-16 flex flex-col items-center gap-4">
          <span className="text-[10px] md:text-[11px] font-bold tracking-[0.25em] text-[#5E0ED7] uppercase">COMMON QUERIES</span>
          <h2 className="text-3xl md:text-4xl font-normal tracking-tight text-white uppercase">FREQUENTLY ASKED QUESTIONS</h2>
        </div>

        {/* Collapsible List */}
        <div className="space-y-4">
          {faqs.map((f, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={f.id}
                className="p-5 rounded-2xl border border-white/5 bg-white/[0.01] hover:border-white/10 transition duration-200 cursor-target"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full flex justify-between items-center text-left focus-visible:ring-1 focus-visible:ring-[#5E0ED7] focus-visible:outline-none rounded-lg"
                >
                  <span className="text-sm font-semibold text-white uppercase tracking-wide flex items-center gap-3">
                    <HelpCircle className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    {f.question}
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {isOpen && (
                  <div className="mt-4 pl-7 border-t border-white/5 pt-4 text-xs text-gray-400 font-light leading-relaxed normal-case">
                    {f.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
