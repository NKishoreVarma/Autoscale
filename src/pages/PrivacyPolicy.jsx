import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function PrivacyPolicy() {
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
            <ShieldCheck className="w-6 h-6" />
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase font-mono">legal statement</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-normal uppercase tracking-tight text-white mt-1">
            Privacy Policy
          </h1>
          <p className="text-xs text-gray-500 font-mono">LAST UPDATED: JUNE 14, 2026</p>
        </div>

        {/* Policy Contents */}
        <div className="space-y-8 text-sm text-gray-300 leading-relaxed normal-case">
          
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white uppercase tracking-wider">1. Information We Collect</h2>
            <p>
              We collect information that you choose to provide directly to us through our forms, contact methods, and service integrations. This includes:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-400 text-xs">
              <li>Personal identifiers (name, company name, phone number, email address).</li>
              <li>Operational audit answers (challenges, team sizes, hourly lost parameters).</li>
              <li>Authentication metadata logged via Google Auth for security verification.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white uppercase tracking-wider">2. How We Use Information</h2>
            <p>
              We process your parameters strictly to deliver services, evaluate operations, and secure transactions:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-400 text-xs">
              <li>To compile customized AI automation and process audit reports.</li>
              <li>To send confirmation logs, updates, and transactional invoices.</li>
              <li>To prevent unauthorized administrative access and secure Firebase API nodes.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white uppercase tracking-wider">3. Data Integrity & Storage</h2>
            <p>
              All customer data, lead forms, and audit answers are stored securely within our Cloud Firestore infrastructure in isolated database sectors. We do not sell, share, or lease customer profiles to third-party advertising brokers. Data is processed exclusively inside your authorized cloud boundaries.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white uppercase tracking-wider">4. Security Standards</h2>
            <p>
              We implement professional safeguards including secure Firebase Security clearance parameters, input sanitization logic, token verification, and encryption-at-rest. However, no digital communication protocol is 100% immune, and we urge clients to manage administrative passwords securely.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white uppercase tracking-wider">5. Contact Information</h2>
            <p>
              If you have any questions regarding this privacy policy or wish to review, update, or purge your records, please contact our data safety architect:
            </p>
            <p className="text-white font-mono text-xs mt-2">
              Email: audit@autoscale.systems <br />
              Entity: AUTOSCALE SYSTEMS PVT LTD
            </p>
          </section>

        </div>

      </div>
    </div>
  );
}
