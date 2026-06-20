import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="relative w-full py-20 px-6 md:px-12 lg:px-16 bg-transparent border-t border-white/10 text-gray-400 text-sm font-light z-10">
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-12">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Logo / Tagline */}
          <div className="flex flex-col gap-3">
            <span className="text-xl font-semibold tracking-tight text-white uppercase">AUTOSCALE</span>
            <p className="text-xs text-gray-500 leading-relaxed uppercase">
              AUTOMATE. OPTIMIZE. SCALE.
            </p>
            <p className="text-xs text-gray-600 leading-relaxed max-w-xs normal-case mt-1">
              We design and assemble custom AI Voice, WhatsApp, and operations pipelines that recover lost revenue on autopilot.
            </p>
          </div>

          {/* Solutions Links */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Solutions</span>
            <nav className="flex flex-col gap-2 text-xs">
              <button onClick={() => scrollToSection('systems')} className="cursor-target hover:text-white transition duration-200 text-left">AI Agents</button>
              <button onClick={() => scrollToSection('systems')} className="cursor-target hover:text-white transition duration-200 text-left">WhatsApp Automation</button>
              <button onClick={() => scrollToSection('systems')} className="cursor-target hover:text-white transition duration-200 text-left">Lead Generation</button>
              <button onClick={() => scrollToSection('systems')} className="cursor-target hover:text-white transition duration-200 text-left">Customer Support</button>
            </nav>
          </div>

          {/* Industries Links */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Industries</span>
            <nav className="flex flex-col gap-2 text-xs">
              <button onClick={() => scrollToSection('industries')} className="cursor-target hover:text-white transition duration-200 text-left">Healthcare</button>
              <button onClick={() => scrollToSection('industries')} className="cursor-target hover:text-white transition duration-200 text-left">Real Estate</button>
              <button onClick={() => scrollToSection('industries')} className="cursor-target hover:text-white transition duration-200 text-left">Ecommerce</button>
              <button onClick={() => scrollToSection('industries')} className="cursor-target hover:text-white transition duration-200 text-left">Legal</button>
            </nav>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Contact</span>
            <nav className="flex flex-col gap-2 text-xs">
              <a href="mailto:audit@autoscale.systems" className="cursor-target hover:text-white transition duration-200 normal-case">audit@autoscale.systems</a>
              <span className="text-gray-600 normal-case">Hyderabad / Bengaluru, India</span>
            </nav>
          </div>

        </div>

        {/* Bottom Block */}
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span>
              &copy; {currentYear} AUTOSCALE SYSTEMS PVT LTD. ALL RIGHTS RESERVED.
            </span>
            <a 
              href="https://linkedin.com/company/autoscale" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="cursor-target text-gray-500 hover:text-white transition duration-200 flex items-center gap-1 font-mono text-[10px]"
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
              <span>LINKEDIN</span>
            </a>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="cursor-target hover:text-white transition duration-200">PRIVACY</Link>
            <Link to="/terms" className="cursor-target hover:text-white transition duration-200">TERMS</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
