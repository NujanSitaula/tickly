'use client';

import { useEffect, useState } from 'react';

/**
 * Returns true when the viewport matches the given media query.
 * SSR-safe: returns false (mobile-first) until hydrated so first paint is mobile layout.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

/** True when viewport is lg (1024px) or wider. */
export function useIsLg(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
