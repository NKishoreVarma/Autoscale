import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * Hook to apply a premium magnetic effect to an element.
 * Pulls the element toward the cursor when hover is close.
 * 
 * @param {object} options
 * @param {number} options.strength Proximity multiplier (default: 0.3)
 * @param {number} options.radius Radius in px (default: 100)
 */
export function useMagnetic(options = {}) {
  const ref = useRef(null);
  const { strength = 0.3, radius = 100 } = options;

  useEffect(() => {
    // Graceful degradation: disable if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const el = ref.current;
    if (!el) return;

    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance < radius) {
        // Attract element
        gsap.to(el, {
          x: deltaX * strength,
          y: deltaY * strength,
          duration: 0.3,
          ease: 'power2.out',
        });
      } else {
        // Return to normal
        gsap.to(el, {
          x: 0,
          y: 0,
          duration: 0.6,
          ease: 'elastic.out(1, 0.3)',
        });
      }
    };

    const handleMouseLeave = () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: 'elastic.out(1, 0.3)',
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
      gsap.killTweensOf(el);
    };
  }, [strength, radius]);

  return ref;
}
