import { useSyncExternalStore, useCallback } from 'react';

/**
 * Custom hook to track media query matches
 * @param query - CSS media query string (e.g., "(min-width: 768px)")
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const media = window.matchMedia(query);

      if (media.addEventListener) {
        media.addEventListener('change', callback);
        return () => media.removeEventListener('change', callback);
      }

      // Fallback for older browsers
      media.addListener(callback);
      return () => media.removeListener(callback);
    },
    [query]
  );

  const getSnapshot = () => {
    return window.matchMedia(query).matches;
  };

  const getServerSnapshot = () => {
    return false;
  };

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
