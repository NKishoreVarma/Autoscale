import React, { useState } from 'react';

export default function VideoLayer() {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Standard high-quality dark abstract tech loop (stable CDN)
  const videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-32115-large.mp4";

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden select-none pointer-events-none z-0 bg-black">
      {/* Fallback Mesh Gradients - Slowly moving background */}
      <div 
        className="absolute inset-0 transition-opacity duration-1000 bg-black opacity-95"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(94, 14, 215, 0.22) 0%, transparent 60%),
            radial-gradient(circle at 80% 70%, rgba(16, 185, 129, 0.15) 0%, transparent 60%)
          `,
          backgroundSize: '200% 200%',
          animation: 'gradient-move 15s ease infinite',
        }}
      />
      
      {/* Background Video */}
      {!videoError && (
        <video
          autoPlay
          loop
          muted
          playsInline
          onCanPlay={() => setVideoLoaded(true)}
          onError={() => setVideoError(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 mix-blend-screen opacity-30 ${
            videoLoaded ? 'opacity-30' : 'opacity-0'
          }`}
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      )}

      {/* Dark Overlay Gradient to blend with page content */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/80 z-10" />

      {/* Embedded CSS for the keyframe animation (keep it contained and scoped) */}
      <style>{`
        @keyframes gradient-move {
          0% { background-position: 0% 50% }
          50% { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }
      `}</style>
    </div>
  );
}
