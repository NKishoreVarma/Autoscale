import { useEffect, useRef } from 'react';

/**
 * Hook to fade and slide up elements when they enter the viewport.
 * Uses IntersectionObserver for high performance.
 * 
 * @param {object} options
 * @param {number} options.threshold Intersection ratio (default: 0.1)
 * @param {number} options.delay Animation delay in ms (default: 0)
 * @param {number} options.duration Animation duration in ms (default: 800)
 * @param {number} options.yOffset Starting Y translate in px (default: 20)
 */
export function useReveal(options = {}) {
  const ref = useRef(null);
  const { threshold = 0.1, delay = 0, duration = 800, yOffset = 20 } = options;

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion) {
      el.style.opacity = '1';
      el.style.transform = 'none';
      return;
    }

    // Initialize hidden states
    el.style.opacity = '0';
    el.style.transform = `translateY(${yOffset}px)`;
    el.style.transition = `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`;
    el.style.transitionDelay = `${delay}ms`;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          // Stop observing once animated
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [threshold, delay, duration, yOffset]);

  return ref;
}
