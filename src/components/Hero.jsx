import React, { useState, useEffect } from 'react';

// Character-by-character sequential line reveal animation component
function AnimatedHeading({ text, trigger }) {
  const lines = text.split('\n');
  let currentDelay = 200; // Start delay for the first line

  return (
    <div className="flex flex-col gap-1 md:gap-2">
      {lines.map((line, lineIdx) => {
        const chars = Array.from(line);
        const lineStartDelay = currentDelay;
        // Accumulate delay: 30ms per char + 250ms pause before starting the next line
        currentDelay += (chars.length * 30) + 250;
        
        return (
          <span key={lineIdx} className="block whitespace-nowrap overflow-hidden">
            {chars.map((char, charIdx) => {
              const delay = lineStartDelay + (charIdx * 30);
              const isSpace = char === ' ';
              return (
                <span
                  key={charIdx}
                  style={{
                    transitionDelay: `${delay}ms`,
                    transitionDuration: '500ms'
                  }}
                  className={`char-span ${trigger ? 'animate' : ''}`}
                >
                  {isSpace ? '\u00A0' : char}
                </span>
              );
            })}
          </span>
        );
      })}
    </div>
  );
}

// Configurable FadeIn wrapper component
function FadeIn({ delay, duration, children }) {
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimated(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      style={{
        transitionProperty: 'opacity',
        transitionDuration: `${duration}ms`,
        opacity: isAnimated ? 1 : 0
      }}
      className="transition-opacity"
    >
      {children}
    </div>
  );
}

export default function Hero() {
  const [headingTrigger, setHeadingTrigger] = useState(false);

  useEffect(() => {
    // Trigger sequential heading animation shortly after mount
    const timer = setTimeout(() => {
      setHeadingTrigger(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenModal = (service = '', message = '') => {
    window.dispatchEvent(new CustomEvent('open-lead-modal', {
      detail: { service, message }
    }));
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative w-full min-h-screen flex flex-col justify-between overflow-hidden bg-transparent">
      {/* spacer to push content to bottom */}
      <div className="flex-1 z-10" />

      {/* Hero Content (Bottom of viewport) */}
      <div className="w-full px-6 md:px-12 lg:px-16 pb-24 lg:pb-32 relative z-10 flex flex-col justify-end pt-32 lg:pt-40">
        <div className="max-w-7xl mx-auto w-full lg:grid lg:grid-cols-12 lg:items-end gap-12">
          
          {/* Left Column - Main content (8 cols) */}
          <div className="lg:col-span-8 flex flex-col items-start text-left">
            {/* Small Label */}
            <span className="text-[10px] md:text-[11px] font-bold tracking-[0.25em] text-gray-300 mb-4 uppercase">
              AI SYSTEMS FOR BUSINESS GROWTH
            </span>

            {/* Large Heading */}
            <h1 
              style={{ 
                fontWeight: 300, 
                letterSpacing: '-0.03em', 
                lineHeight: 1.05, 
                maxWidth: '1152px' 
              }}
              className="text-4xl md:text-5xl lg:text-6xl xl:text-7.5xl text-white uppercase"
            >
              <AnimatedHeading 
                text="YOUR BUSINESS IS LEAKING REVENUE.&#10;WE IDENTIFY THE LEAKS.&#10;WE BUILD THE SYSTEMS.&#10;WE SCALE THE RESULTS."
                trigger={headingTrigger}
              />
            </h1>

            {/* 80px Spacing between Heading and Description */}
            <div className="h-20" />

            {/* Subheading */}
            <FadeIn delay={1300} duration={1000}>
              <p className="text-base md:text-lg text-gray-300 max-w-xl font-light leading-relaxed">
                We build AI agents, communication systems, and automation infrastructure that eliminate bottlenecks and unlock growth.
              </p>
            </FadeIn>

            {/* 64px Spacing between Description and Buttons */}
            <div className="h-16" />

            {/* Action Buttons */}
            <FadeIn delay={1700} duration={1000}>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => handleOpenModal('Custom Systems', 'Requesting Free Automation Audit')}
                  className="bg-white text-black px-8 py-3.5 rounded-lg text-sm font-medium hover:bg-[#5E0ED7] hover:text-white transition duration-200 active:scale-[0.98] cursor-target"
                >
                  Book Free Audit
                </button>
                <button
                  onClick={() => scrollToSection('automate-selector')}
                  className="liquid-glass border border-white/20 text-white px-8 py-3.5 rounded-lg text-sm font-medium hover:bg-white hover:text-black transition duration-200 active:scale-[0.98] cursor-target"
                >
                  Explore Solutions
                </button>
              </div>
            </FadeIn>
          </div>

          {/* Right Column - Tag (4 cols) */}
          <div className="lg:col-span-4 flex items-end justify-start lg:justify-end mt-12 lg:mt-0">
            <FadeIn delay={2100} duration={1000}>
              <div className="liquid-glass border border-white/20 px-8 py-6 rounded-xl flex flex-col gap-2 w-fit">
                <span className="text-xl md:text-2xl lg:text-3xl font-light text-white tracking-widest uppercase block">AUTOMATE.</span>
                <span className="text-xl md:text-2xl lg:text-3xl font-light text-white tracking-widest uppercase block">OPTIMIZE.</span>
                <span className="text-xl md:text-2xl lg:text-3xl font-light text-white tracking-widest uppercase block">SCALE.</span>
              </div>
            </FadeIn>
          </div>

        </div>
      </div>
    </section>
  );
}
