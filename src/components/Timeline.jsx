import React from 'react';

const STEPS_DATA = [
  { 
    num: "01", 
    title: "Audit", 
    desc: "We analyze operations and identify exact revenue leaks." 
  },
  { 
    num: "02", 
    title: "Design", 
    desc: "We architect custom workflows and system specifications." 
  },
  { 
    num: "03", 
    title: "Build", 
    desc: "We engineer automation pipelines and integrate databases." 
  },
  { 
    num: "04", 
    title: "Deploy", 
    desc: "We establish live hooks and sync communication channels." 
  },
  { 
    num: "05", 
    title: "Optimize", 
    desc: "We monitor performance metrics and refine system models." 
  }
];

export default function Timeline() {
  return (
    <section id="process" className="section-container relative w-full bg-transparent border-t border-white/10">
      <div className="max-w-4xl mx-auto w-full">
        
        {/* Title */}
        <div className="text-center md:text-left max-w-xl mb-24 flex flex-col gap-4">
          <span className="text-[10px] md:text-[11px] font-bold tracking-[0.25em] text-[#5E0ED7] uppercase">
            SYSTEM ASSEMBLY
          </span>
          <h2 className="text-3xl md:text-5xl font-normal tracking-tight text-white uppercase">
            DELIVERY PROCESS
          </h2>
        </div>

        {/* Vertical Timeline */}
        <div className="relative pl-8 md:pl-16 border-l border-white/10 flex flex-col gap-12">
          {STEPS_DATA.map((step, idx) => (
            <div key={idx} className="relative group cursor-target">
              {/* Timeline Bullet */}
              <div className="absolute -left-[37px] md:-left-[69px] top-1 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white group-hover:scale-125 transition duration-300 border border-black" />
              </div>

              {/* Step Content */}
              <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
                <span className="text-xs font-mono font-bold text-gray-500 leading-none pt-0.5 group-hover:text-white transition duration-300">
                  {step.num}
                </span>

                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-semibold text-white uppercase">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-300 font-light leading-relaxed max-w-xl">
                    {step.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
