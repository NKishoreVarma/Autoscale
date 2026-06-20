import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Star, MessageSquare } from 'lucide-react';

const DEFAULT_TESTIMONIALS = [
  {
    name: "Amit Patel",
    company: "Patel Care Clinics",
    review: "Integrating AutoScale's WhatsApp scheduling bot completely transformed our booking intake. We reduced missed patient inquiries to near zero and increased appointment volumes by 35%.",
    rating: 5,
    published: true,
    order: 0
  },
  {
    name: "Priya Nair",
    company: "Green Space Realty",
    review: "We reclaimed over 15 hours of manual follow-up work every single week. Leads generated from Facebook ads are qualified and booked into our calendars in under 90 seconds.",
    rating: 5,
    published: true,
    order: 1
  },
  {
    name: "Rahul Sharma",
    company: "TechBuilders India",
    review: "Bespoke operational architecture that cut report generation down to seconds. Highly recommend the Founder Overview dashboard.",
    rating: 5,
    published: true,
    order: 2
  }
];

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'testimonials'));
    const unsubscribe = onSnapshot(q, async (snap) => {
      if (snap.empty) {
        console.log("[Testimonials] No testimonials found. Seeding defaults...");
        for (const t of DEFAULT_TESTIMONIALS) {
          try {
            await addDoc(collection(db, 'testimonials'), {
              ...t,
              createdAt: serverTimestamp()
            });
          } catch (e) {
            console.error("Error seeding testimonial:", e);
          }
        }
      } else {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Filter published items and sort by order in-memory
        const active = list
          .filter(t => t.published !== false)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        setTestimonials(active);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <section id="testimonials" className="section-container relative w-full bg-transparent border-t border-white/10">
      <div className="w-full">
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-20 flex flex-col items-center gap-4">
          <span className="text-[10px] md:text-[11px] font-bold tracking-[0.25em] text-[#5E0ED7] uppercase font-mono">PARTNER REVIEWS</span>
          <h2 className="text-3xl md:text-5xl font-normal tracking-tight text-white uppercase">WHAT OUR CLIENTS SAY</h2>
        </div>

        {/* Scrollable list */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="p-6 rounded-3xl border border-white/5 bg-white/[0.01] hover:border-white/10 transition duration-300 flex flex-col justify-between gap-6"
            >
              <div>
                {/* Rating stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating || 5 }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <p className="text-xs text-gray-300 font-light leading-relaxed normal-case italic">
                  "{t.review || t.quote || ''}"
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                <div className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-gray-500">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white uppercase">{t.name || t.clientName || ''}</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{t.company || t.companyName || ''}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
