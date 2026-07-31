'use client';

import { useEffect } from 'react';

/**
 * Handles iOS virtual keyboard viewport issues.
 * - Scrolls focused inputs into view when keyboard opens
 * - Uses visualViewport API to detect keyboard presence
 * - Sets CSS custom property for keyboard-aware layouts
 */
export function useKeyboardViewport() {
  useEffect(() => {
    // Only run on touch devices
    if (!('ontouchstart' in window)) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if (!isInput) return;

      // Delay to allow keyboard to fully open
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    };

    // Use visualViewport API to track keyboard height
    const viewport = window.visualViewport;
    if (viewport) {
      const handleResize = () => {
        const keyboardHeight = window.innerHeight - viewport.height;
        document.documentElement.style.setProperty(
          '--keyboard-height',
          `${keyboardHeight}px`
        );
      };

      viewport.addEventListener('resize', handleResize);
      document.addEventListener('focusin', handleFocusIn);

      return () => {
        viewport.removeEventListener('resize', handleResize);
        document.removeEventListener('focusin', handleFocusIn);
        document.documentElement.style.removeProperty('--keyboard-height');
      };
    }

    // Fallback: just handle focusin for scroll-into-view
    document.addEventListener('focusin', handleFocusIn);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, []);
}
