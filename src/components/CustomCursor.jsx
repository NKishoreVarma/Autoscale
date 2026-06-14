import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function CustomCursor() {
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [cursorVariant, setCursorVariant] = useState("default");

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });

      // Automatically detect hoverable target tags to expand cursor size
      const isHoverable = e.target.closest('a, button, select, input, textarea, [role="button"], .hoverable, .service-orbit-card, .card, [class*="card"], [class*="Card"]');
      setCursorVariant(isHoverable ? "hover" : "default");
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const cursorVariants = {
    default: {
      x: mousePos.x - 12,
      y: mousePos.y - 12,
      height: 24,
      width: 24,
      backgroundColor: "transparent",
      border: "1.5px solid #5E0ED7",
    },
    hover: {
      x: mousePos.x - 18,
      y: mousePos.y - 18,
      height: 36,
      width: 36,
      backgroundColor: "rgba(94, 14, 215, 0.05)",
      border: "1.5px solid #5E0ED7",
    }
  };

  return (
    <>
      {/* Outer Ring */}
      <motion.div
        className="hidden lg:block fixed top-0 left-0 rounded-full pointer-events-none z-[100] mix-blend-screen"
        variants={cursorVariants}
        animate={cursorVariant}
        transition={{ type: "spring", stiffness: 450, damping: 28, mass: 0.2 }}
      />
      {/* Center Dot */}
      <div
        className="hidden lg:block fixed top-0 left-0 w-2 h-2 bg-white rounded-full pointer-events-none z-[100] -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${mousePos.x}px`,
          top: `${mousePos.y}px`
        }}
      />
    </>
  );
}
