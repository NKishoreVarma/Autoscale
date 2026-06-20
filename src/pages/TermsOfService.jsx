import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsOfService() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="relative min-h-screen text-white font-light bg-black py-24 px-6 md:px-12 lg:px-16 selection:bg-white selection:text-black">
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none -z-10" />

      <div className="max-w-3xl mx-auto w-full flex flex-col gap-10">
        
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-white transition duration-200 cursor-target w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Home</span>
        </button>

        {/* Header */}
        <div className="flex flex-col gap-3 pb-8 border-b border-white/10">
          <div className="flex items-center gap-3 text-[#5E0ED7]">
            <FileText className="w-6 h-6" />
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase font-mono">service framework</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-normal uppercase tracking-tight text-white mt-1">
            Terms of Service
          </h1>
          <p className="text-xs text-gray-500 font-mono">LAST UPDATED: JUNE 14, 2026</p>
        </div>

        {/* Terms Contents */}
        <div className="space-y-8 text-sm text-gray-300 leading-relaxed normal-case">
          
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white uppercase tracking-wider">1. Operational Deliverables</h2>
            <p>
              AutoScale agree to construct, configure, and deploy custom workflow systems, AI voice/chat nodes, and CRM integrations as detailed in individual agreed proposals. Any secondary modifications outside of the agreed scope will require a separate billing schedule or system upgrade agreement.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white uppercase tracking-wider">2. System Ownership & Licensing</h2>
            <p>
              Once a project's balance invoices are fully cleared, the client retains 100% ownership of the final deployed code, specific database schemes, and operational system integrations built for their environment. AutoScale retains the right to reuse underlying boilerplate libraries, generic connectors, and configuration templates.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white uppercase tracking-wider">3. Payment & Billing Terms</h2>
            <p>
              All system assembly projects are subject to the following schedule unless explicitly modified in writing:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-400 text-xs">
              <li>50% upfront setup fee due before the operational audit and architecture design begins.</li>
              <li>50% final delivery fee due upon successful live deployment and handover of the system.</li>
              <li>Invoices are generated dynamically inside the AutoScale dashboard and must be cleared within 7 business days of issuance.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white uppercase tracking-wider">4. Third-Party Costs</h2>
            <p>
              The client is solely responsible for third-party hosting, platform, and API usage fees, including but not limited to: Firebase usage billing, OpenAI/Google Gemini API tokens, Twilio WhatsApp volumes, and external CRM node fees. AutoScale does not include these operating costs within its setup quotes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white uppercase tracking-wider">5. Liability Disclaimer</h2>
            <p>
              AutoScale constructs systems with high precision and security. However, we do not accept liability for operational downtime, API connection dropouts by third-party services (e.g., Twilio, OpenAI, Google), or loss of business metrics resulting from external provider failures or client credential misconfigurations.
            </p>
          </section>

        </div>

      </div>
    </div>
  );
}
