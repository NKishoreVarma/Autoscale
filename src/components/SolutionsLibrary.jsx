import React, { useState, useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const DEFAULT_SYSTEMS = [
  {
    name: "AI Agents",
    category: "AI Agents",
    description: "Autonomous intelligence designed to execute complex, multi-step cognitive workflows.",
    deliveryTime: "Deploy: 14 Days",
    isVisible: true,
    isFeatured: true,
    price: 50000,
    order: 0
  },
  {
    name: "WhatsApp Automation",
    category: "WhatsApp Automation",
    description: "Scale customer communications, qualification, and scheduling via secure messaging pipelines.",
    deliveryTime: "Deploy: 7 Days",
    isVisible: true,
    isFeatured: true,
    price: 25000,
    order: 1
  },
  {
    name: "Lead Generation",
    category: "Lead Generation",
    description: "Instant ad-lead ingestion, scoring, and CRM routing with automated scheduling.",
    deliveryTime: "Deploy: 5 Days",
    isVisible: true,
    isFeatured: true,
    price: 15000,
    order: 2
  },
  {
    name: "Customer Support",
    category: "Customer Support",
    description: "Deflect up to 75% of support tickets with real-time API integrations and FAQ databases.",
    deliveryTime: "Deploy: 10 Days",
    isVisible: true,
    isFeatured: true,
    price: 35000,
    order: 3
  },
  {
    name: "Business Automation",
    category: "CRM Automation",
    description: "Synchronize data and workflows across databases, accounting nodes, and CRM suites.",
    deliveryTime: "Deploy: 7 Days",
    isVisible: true,
    isFeatured: true,
    price: 20000,
    order: 4
  },
  {
    name: "Custom Systems",
    category: "Custom Systems",
    description: "Bespoke operational architecture designed from scratch to resolve your specific leaks.",
    deliveryTime: "Deploy: 21 Days",
    isVisible: true,
    isFeatured: true,
    price: 75000,
    order: 5
  }
];

export default function SolutionsLibrary() {
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[SolutionsLibrary] Subscribing to services collection...');
    const q = query(collection(db, 'services'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        console.log('[SolutionsLibrary] No services found in Firestore. Seeding defaults...');
        for (const sys of DEFAULT_SYSTEMS) {
          try {
            await addDoc(collection(db, 'services'), {
              ...sys,
              createdAt: serverTimestamp()
            });
          } catch (err) {
            console.error('Error seeding service:', err);
          }
        }
      } else {
        const docs = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(sys => sys.isVisible !== false);
        setSystems(docs);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleOpenModal = (service) => {
    window.dispatchEvent(new CustomEvent('open-lead-modal', {
      detail: { service, message: `Inquiry about ${service} System.` }
    }));
  };

  return (
    <section id="systems" className="section-container relative w-full bg-transparent border-t border-white/10">
      <div className="w-full">
        
        {/* Title Block */}
        <div className="text-center max-w-2xl mx-auto mb-20 flex flex-col items-center gap-4">
          <span className="text-[10px] md:text-[11px] font-bold tracking-[0.25em] text-[#5E0ED7] uppercase">
            OPERATIONAL CAPABILITIES
          </span>
          <h2 className="text-3xl md:text-5xl font-normal tracking-tight text-white uppercase">
            BUSINESS SYSTEMS
          </h2>
        </div>

        {/* 6 Grid Cards */}
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {systems.map((sys) => (
              <div 
                key={sys.id}
                className="cursor-target relative p-8 rounded-[24px] border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] hover:border-[#5E0ED7]/25 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(94,14,215,0.06)] transition-all duration-300 flex flex-col justify-between h-[280px] group overflow-hidden"
                style={{
                  boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)'
                }}
              >
                <div className="absolute inset-0 bg-[#5E0ED7]/[0.01] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none blur-2xl" />

                <div>
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="text-lg md:text-xl font-medium text-white uppercase truncate">
                      {sys.name}
                    </h3>
                    {sys.deliveryTime && (
                      <span className="text-[10px] font-medium text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded flex-shrink-0">
                        {sys.deliveryTime.startsWith('Deploy:') ? sys.deliveryTime : `Deploy: ${sys.deliveryTime}`}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed font-light mt-4 line-clamp-4">
                    {sys.description}
                  </p>
                </div>

                {/* Action Link */}
                <div 
                  onClick={() => handleOpenModal(sys.name)}
                  className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-white/60 hover:text-white transition duration-200 w-fit"
                >
                  <span>Learn More</span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
