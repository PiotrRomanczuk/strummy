'use client';

import { type RefObject } from 'react';
import { useScroll } from 'framer-motion';
import type { SectionScroll } from './types';

/**
 * Single useScroll handle per section, designed to be shared by every motion
 * child inside it. Avoids spinning up dozens of independent scroll listeners.
 */
export function useSectionScroll(ref: RefObject<HTMLElement | null>): SectionScroll {
  const { scrollYProgress } = useScroll({
    target: ref as RefObject<HTMLElement>,
    offset: ['start end', 'end start'],
  });
  return { scrollYProgress };
}
