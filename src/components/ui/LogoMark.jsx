import React from 'react';

export default function LogoMark({ className = "w-8 h-8" }) {
  return (
    <div className={`relative group cursor-pointer ${className}`}>
      {/* Background Glow */}
      <div className="absolute inset-0 bg-brand-primary rounded-lg blur opacity-0 group-hover:opacity-75 transition duration-500 group-hover:duration-200"></div>
      
      {/* SVG Icon */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative w-full h-full transform group-hover:scale-105 transition duration-500 ease-out"
      >
        {/* Outer Ring */}
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke="url(#logo-gradient)"
          strokeWidth="3.5"
          className="opacity-95"
        />
        {/* Inner Tech Cross / Triangles */}
        <path
          d="M50 20 L75 68 L25 68 Z"
          stroke="url(#logo-gradient-green)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          className="opacity-90"
        />
        <path
          d="M50 80 L25 32 L75 32 Z"
          stroke="url(#logo-gradient)"
          strokeWidth="2"
          strokeLinejoin="round"
          className="opacity-40"
        />
        {/* Center Node Core */}
        <circle cx="50" cy="50" r="6" fill="#FFFFFF" />
        <circle cx="50" cy="50" r="14" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="3 3" className="animate-spin" style={{ animationDuration: '20s' }} />

        {/* Gradients */}
        <defs>
          <linearGradient id="logo-gradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#5E0ED7" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id="logo-gradient-green" x1="0" y1="100" x2="100" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#5E0ED7" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
