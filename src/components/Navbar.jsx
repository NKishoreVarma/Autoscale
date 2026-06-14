import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenModal = () => {
    window.dispatchEvent(new CustomEvent('open-lead-modal', {
      detail: { service: '', message: '' }
    }));
  };

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 px-6 md:px-12 lg:px-16 pt-6">
        <div 
          className="rounded-xl px-4 py-2.5 flex items-center justify-between relative"
          style={{
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            background: 'rgba(0, 0, 0, 0.55)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)'
          }}
        >
          
          {/* Left: Brand Name */}
          <div 
            className="cursor-pointer cursor-target"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <span className="text-xl md:text-2xl font-semibold tracking-tight text-white uppercase">AUTOSCALE</span>
          </div>

          {/* Center: Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-300">
            <button 
              onClick={() => scrollToSection('systems')} 
              className="cursor-target hover:text-white transition duration-200"
            >
              Solutions
            </button>
            <button 
              onClick={() => scrollToSection('industries')} 
              className="cursor-target hover:text-white transition duration-200"
            >
              Industries
            </button>
            <button 
              onClick={() => scrollToSection('case-studies')} 
              className="cursor-target hover:text-white transition duration-200"
            >
              Case Studies
            </button>
            <button 
              onClick={() => scrollToSection('cta')} 
              className="cursor-target hover:text-white transition duration-200"
            >
              Contact
            </button>
          </nav>

          {/* Right: CTA Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleOpenModal}
              className="hidden sm:inline-block bg-white text-black px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#5E0ED7] hover:text-white transition duration-200 active:scale-[0.98] cursor-target"
            >
              Book Audit
            </button>

            {/* Mobile Menu Burger system */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex flex-col gap-1.5 md:hidden z-50 focus:outline-none bg-white p-3 rounded-full relative"
            >
              <span className={`w-4 h-[2px] bg-black transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-[5.5px]' : ''}`} />
              <span className={`w-4 h-[2px] bg-black transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`w-4 h-[2px] bg-black transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-[5.5px]' : ''}`} />
            </button>
          </div>

        </div>
      </header>

      {/* MOBILE SCREEN OVERLAY DRAWER */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/95 backdrop-blur-md flex flex-col justify-center p-8"
          >
            <div className="flex flex-col gap-6 text-left">
              <button 
                onClick={() => { setIsMobileMenuOpen(false); scrollToSection('systems'); }}
                className="text-2xl font-bold tracking-widest uppercase text-white hover:text-[#5E0ED7] transition text-left"
              >
                Solutions
              </button>
              <button 
                onClick={() => { setIsMobileMenuOpen(false); scrollToSection('industries'); }}
                className="text-2xl font-bold tracking-widest uppercase text-white hover:text-[#5E0ED7] transition text-left"
              >
                Industries
              </button>
              <button 
                onClick={() => { setIsMobileMenuOpen(false); scrollToSection('case-studies'); }}
                className="text-2xl font-bold tracking-widest uppercase text-white hover:text-[#5E0ED7] transition text-left"
              >
                Case Studies
              </button>
              <button 
                onClick={() => { setIsMobileMenuOpen(false); scrollToSection('cta'); }}
                className="text-2xl font-bold tracking-widest uppercase text-white hover:text-[#5E0ED7] transition text-left"
              >
                Contact
              </button>
              
              <button 
                onClick={() => { setIsMobileMenuOpen(false); handleOpenModal(); }}
                className="w-full text-center py-4 bg-[#5E0ED7] text-white font-bold uppercase text-sm mt-8 rounded-xl"
              >
                Book Free Audit
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
