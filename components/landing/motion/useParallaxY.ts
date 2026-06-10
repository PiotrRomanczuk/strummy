'use client';

import { type RefObject, useRef } from 'react';
import { type MotionValue, useScroll, useTransform } from 'framer-motion';
import { useReducedMotionSafe } from './useReducedMotionSafe';

/**
 * Returns a MotionValue<number> that drives a Y translate based on the scroll
 * position of `ref` (or the viewport if not provided). `speed` is the magnitude
 * — positive = moves faster than scroll, negative = moves opposite. Typical
 * range: [-0.3, 0.3].
 */
export function useParallaxY(
  speed: number,
  ref?: RefObject<HTMLElement | null>
): MotionValue<number> {
  const reduced = useReducedMotionSafe();
  const fallback = useRef<HTMLElement | null>(null);
  const target = ref ?? fallback;

  const { scrollYProgress } = useScroll({
    target: target as RefObject<HTMLElement>,
    offset: ['start end', 'end start'],
  });

  const distance = reduced ? 0 : speed * 240;
  return useTransform(scrollYProgress, [0, 1], [-distance, distance]);
}
