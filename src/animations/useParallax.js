import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * Hook to apply a subtle mouse parallax movement to an element.
 * 
 * @param {object} options
 * @param {number} options.factorX Horizontal offset scale in px (default: 15)
 * @param {number} options.factorY Vertical offset scale in px (default: 15)
 */
export function useParallax(options = {}) {
  const ref = useRef(null);
  const { factorX = 15, factorY = 15 } = options;

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const el = ref.current;
    if (!el) return;

    const handleMouseMove = (e) => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Calculate relative position (-1 to 1) from screen center
      const relX = (e.clientX - width / 2) / (width / 2);
      const relY = (e.clientY - height / 2) / (height / 2);

      gsap.to(el, {
        x: relX * factorX,
        y: relY * factorY,
        duration: 0.8,
        ease: 'power2.out',
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      gsap.killTweensOf(el);
    };
  }, [factorX, factorY]);

  return ref;
}
