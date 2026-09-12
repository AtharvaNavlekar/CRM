import { useState, useEffect } from 'react';

export type Breakpoint = 'sm' | 'md' | 'lg';

/**
 * Custom React hook that returns the current responsive breakpoint.
 * 
 * - 'sm' = < 640px (smartphones)
 * - 'md' = 640–1023px (tablets, small laptops)
 * - 'lg' = ≥ 1024px (desktops, large monitors)
 * 
 * Prefer Tailwind CSS responsive classes (hidden md:block, etc.) for
 * simple show/hide logic. Use this hook only when you need to render
 * fundamentally different component trees (e.g., table vs. card list).
 */
export function useBreakpoint(): Breakpoint {
  const getBreakpoint = (): Breakpoint => {
    if (typeof window === 'undefined') return 'lg';
    if (window.innerWidth < 640) return 'sm';
    if (window.innerWidth < 1024) return 'md';
    return 'lg';
  };

  const [breakpoint, setBreakpoint] = useState<Breakpoint>(getBreakpoint);

  useEffect(() => {
    let rafId: number;
    const handleResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setBreakpoint(getBreakpoint());
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return breakpoint;
}

/** Convenience booleans */
export function useIsMobile(): boolean {
  return useBreakpoint() === 'sm';
}

export function useIsTablet(): boolean {
  return useBreakpoint() === 'md';
}

export function useIsDesktop(): boolean {
  return useBreakpoint() === 'lg';
}
