import * as React from 'react';

type LayoutMode = 'widescreen' | 'tablet' | 'mobile';

function getLayoutMode(): LayoutMode {
  if (typeof window === 'undefined') return 'mobile';
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspectRatio = width / height;

  if (width >= 1024 && aspectRatio >= 1.2) return 'widescreen';
  if (width >= 768) return 'tablet';
  return 'mobile';
}

/**
 * Hook to detect display layout mode for responsive navigation.
 *
 * Detection logic:
 * - Width >= 1024px AND aspect ratio >= 1.2 = widescreen (full sidebar)
 * - Width >= 768px (tablet range, e.g. iPad portrait/landscape) = tablet (collapsed sidebar)
 * - Otherwise = mobile (horizontal nav + bottom nav)
 */
export function useLayoutMode(): LayoutMode {
  // Initial state must be the SSR value ('mobile'), not window-derived —
  // reading window in the useState initializer makes the first client render
  // disagree with the server HTML and throws hydration errors on every
  // desktop visit. The layout effect corrects the mode before first paint.
  const [mode, setMode] = React.useState<LayoutMode>('mobile');

  React.useLayoutEffect(() => {
    const check = () => setMode(getLayoutMode());
    check();

    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);

    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  return mode;
}

/**
 * @deprecated Use `useLayoutMode()` instead for finer-grained layout control.
 * Kept for backward compatibility — returns true for widescreen OR tablet.
 */
export function useIsWidescreen() {
  const mode = useLayoutMode();
  return mode === 'widescreen' || mode === 'tablet';
}
