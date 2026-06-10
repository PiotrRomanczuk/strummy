'use client';

import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import { easeCine } from './easings';
import { useReducedMotionSafe } from './useReducedMotionSafe';

type Props = {
  children: ReactNode;
  className?: string;
  y?: number;
  delay?: number;
};

/**
 * Drop-in child of <ScrollReveal>. Use when you need explicit control over
 * which descendants animate (instead of <ScrollReveal>'s auto-wrap behaviour).
 */
export function RevealItem({ children, className, y = 24, delay = 0 }: Props) {
  const reduced = useReducedMotionSafe();
  // Opacity stays at 1 — only `y` shifts. See ScrollReveal.tsx for rationale.
  const item: Variants = {
    hidden: { y: reduced ? 0 : y },
    show: {
      y: 0,
      transition: { duration: 0.7, delay, ease: easeCine },
    },
  };
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}
