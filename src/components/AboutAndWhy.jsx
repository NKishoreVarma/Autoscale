import React from 'react';
import { Mail, Shield, Award, Landmark, Activity } from 'lucide-react';

export default function AboutAndWhy() {
  const handleOpenModal = () => {
    window.dispatchEvent(new CustomEvent('open-lead-modal', {
      detail: { service: 'Custom Systems', message: 'Requesting consultation from About & Why section.' }
    }));
  };

  const whyItems = [
    {
      title: "Zero Monthly Retainers",
      desc: "We build and hand over. Once deployed, you own the entire automation architecture with zero mandatory ongoing licensing or agency management fees.",
      icon: Landmark
    },
    {
      title: "100% Data Ownership",
      desc: "All system pipelines run within your secure Firebase environment and direct API integrations. We do not store your data on external intermediary databases.",
      icon: Shield
    },
    {
      title: "ROI-Linked Telemetry",
      desc: "Every automation system is configured with telemetry to track real business parameters: qualification rates, response speed, and recovered revenue leakage.",
      icon: Activity
    },
    {
      title: "Enterprise Grade Quality",
      desc: "We construct reliable software using strict state transitions, input sanitization, and database protection rules. Built for production-grade reliability.",
      icon: Award
    }
  ];

  return (
    <section id="about" className="section-container relative w-full bg-transparent border-t border-white/10 py-24 md:py-32">
      {/* Grid pattern background wrapper */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.003)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.003)_1px,transparent_1px)] bg-[size:6rem_6rem] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start">
          
          {/* Left Side: About AutoScale & Contact */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <span className="text-[10px] md:text-[11px] font-bold tracking-[0.25em] text-[#5E0ED7] uppercase">
                WHO WE ARE
              </span>
              <h2 className="text-3xl md:text-5xl font-normal leading-[1.15] text-white uppercase tracking-tight">
                ABOUT <br />
                AUTOSCALE
              </h2>
            </div>
            
            <p className="text-sm text-gray-300 leading-relaxed font-light normal-case">
              AutoScale is an autonomous AI systems integration firm and operational CRM agency. We build cognitive AI voice agents, secure messaging workflows, and CRM pipeline databases designed to eliminate manual bottlenecks and recover lost revenue. 
            </p>
            <p className="text-sm text-gray-400 leading-relaxed font-light normal-case">
              Unlike traditional agencies that hook clients into endless retainers, we focus on engineering standalone, robust systems that our clients own completely. We operate out of India's technology hubs, Hyderabad and Bengaluru, delivering world-class software orchestration.
            </p>

            {/* Trust Badges / Contact Info */}
            <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row gap-6 sm:gap-12 text-xs">
              <div className="flex flex-col gap-2">
                <span className="font-bold text-white uppercase tracking-widest">Business Email</span>
                <a 
                  href="mailto:audit@autoscale.systems" 
                  className="text-gray-400 hover:text-white transition duration-200 flex items-center gap-2 cursor-target"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>audit@autoscale.systems</span>
                </a>
              </div>
              
              <div className="flex flex-col gap-2">
                <span className="font-bold text-white uppercase tracking-widest">Connect with Us</span>
                <a 
                  href="https://linkedin.com/company/autoscale" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gray-400 hover:text-white transition duration-200 flex items-center gap-2 cursor-target"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                  <span>LinkedIn /autoscale</span>
                </a>
              </div>
            </div>

            <button
              onClick={handleOpenModal}
              className="mt-4 w-fit px-6 py-3 rounded-lg bg-white text-black text-xs font-semibold tracking-wider hover:bg-[#5E0ED7] hover:text-white transition duration-200 cursor-target uppercase"
            >
              Consult with our architects
            </button>
          </div>

          {/* Right Side: Why Choose AutoScale */}
          <div className="lg:col-span-7 flex flex-col gap-10">
            <div className="flex flex-col gap-3">
              <span className="text-[10px] md:text-[11px] font-bold tracking-[0.25em] text-[#5E0ED7] uppercase">
                OUR VALUE PRINCIPLES
              </span>
              <h3 className="text-xl md:text-2xl font-light text-white uppercase tracking-wider">
                WHY CHOOSE AUTOSCALE
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {whyItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div 
                    key={idx} 
                    className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] hover:border-white/10 transition duration-300 flex flex-col gap-4"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white">
                      <Icon className="w-4 h-4 text-gray-300" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <h4 className="text-sm font-semibold text-white uppercase">{item.title}</h4>
                      <p className="text-xs text-gray-400 font-light leading-relaxed normal-case">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Client Logos trust grid */}
        <div className="mt-20 pt-16 border-t border-white/5 flex flex-col items-center gap-8">
          <span className="text-[9px] font-bold tracking-[0.3em] text-gray-500 uppercase">
            ENGINEERED TO ENTERPRISE STANDARDS
          </span>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 w-full items-center justify-items-center opacity-40">
            {['STRIPE', 'LINEAR', 'VERCEL', 'NOTION', 'HUBSPOT', 'ACME'].map((logo, idx) => (
              <span 
                key={idx} 
                className="font-mono text-base font-extrabold tracking-[0.2em] text-white hover:text-purple-400 transition duration-300 select-none cursor-default"
              >
                {logo}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
