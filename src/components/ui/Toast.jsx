import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

const ICONS = {
  success: CheckCircle,
  error: AlertOctagon,
  warning: AlertTriangle,
  info: Info
};

const COLORS = {
  success: 'border-emerald-500/20 text-emerald-400 bg-emerald-950/80',
  error: 'border-rose-500/20 text-rose-400 bg-rose-950/80',
  warning: 'border-amber-500/20 text-amber-400 bg-amber-950/80',
  info: 'border-[#5E0ED7]/20 text-purple-400 bg-purple-950/80'
};

const ICON_COLORS = {
  success: 'text-emerald-400',
  error: 'text-rose-400',
  warning: 'text-amber-400',
  info: 'text-purple-400'
};

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (e) => {
      const { message, type = 'info' } = e.detail;
      const id = Date.now() + Math.random().toString(36).substr(2, 9);
      
      setToasts(prev => [...prev, { id, message, type }]);
      
      // Auto dismiss after 4 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    };

    window.addEventListener('toast-notify', handleToast);
    return () => window.removeEventListener('toast-notify', handleToast);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          const Icon = ICONS[toast.type] || Info;
          const bgClass = COLORS[toast.type] || COLORS.info;
          const iconClass = ICON_COLORS[toast.type] || ICON_COLORS.info;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={`p-4 rounded-xl border backdrop-blur-md flex gap-3 items-start pointer-events-auto shadow-2xl ${bgClass}`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconClass}`} />
              <div className="flex-grow text-xs leading-relaxed text-gray-200">
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-white transition p-0.5 mt-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
