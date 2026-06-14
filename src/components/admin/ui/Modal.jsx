import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const SIZE_MAP = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
};

export default function Modal({ isOpen, onClose, title, subtitle, children, size = 'md', footer }) {
  const modalRef = useRef(null);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Panel */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`relative w-full ${sizeClass} bg-black border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] z-10`}
            style={{
              boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05), 0 25px 50px -12px rgba(0, 0, 0, 0.8)'
            }}
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-start justify-between flex-shrink-0 bg-white/[0.01] rounded-t-2xl">
              <div className="flex flex-col">
                {subtitle && (
                  <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">
                    {subtitle}
                  </span>
                )}
                <h2 className="text-xl font-normal text-white uppercase mt-1 tracking-tight">
                  {title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition duration-200 flex-shrink-0 ml-4"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-grow overflow-y-auto p-6 no-scrollbar">
              {children}
            </div>

            {/* Optional Footer */}
            {footer && (
              <div className="p-6 border-t border-white/10 flex-shrink-0 bg-white/[0.01] rounded-b-2xl">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
