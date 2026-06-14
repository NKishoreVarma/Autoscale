import React from 'react';

const industries = [
  "HEALTHCARE",
  "REAL ESTATE",
  "EDUCATION",
  "ECOMMERCE",
  "AGENCIES",
  "LEGAL",
  "SAAS",
  "RESTAURANTS"
];

export default function IndustriesBar() {
  // Triple the array to ensure seamless infinite looping on wider displays
  const marqueeItems = [...industries, ...industries, ...industries];

  return (
    <div className="relative w-full py-8 border-y border-white/10 bg-black/60 backdrop-blur-sm overflow-hidden select-none z-10">
      
      {/* Edge gradient mask for smooth fade in/out */}
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

      {/* Infinite scrolling track */}
      <div className="flex w-max animate-marquee-infinite">
        {marqueeItems.map((ind, idx) => (
          <div 
            key={`${ind}-${idx}`}
            className="flex items-center"
          >
            {/* Industry Name */}
            <span className="text-[10px] font-extrabold tracking-[0.25em] text-brand-text/40 hover:text-white transition duration-300 mx-10">
              {ind}
            </span>
            
            {/* Custom Separator Diamond */}
            <span className="w-1.5 h-1.5 rotate-45 border border-brand-primary/40 bg-brand-primary/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
