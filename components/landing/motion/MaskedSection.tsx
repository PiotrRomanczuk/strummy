'use client';

import { type ReactNode, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useReducedMotionSafe } from './useReducedMotionSafe';

type Props = {
  children: ReactNode;
  className?: string;
  /** Inset percentage at entry (0 = no mask, 12 = strong mask). */
  insetFrom?: number;
  /** Scale at entry (1 = no zoom, 1.05 = subtle zoom-out). */
  scaleFrom?: number;
  rounded?: number;
};

export function MaskedSection({
  children,
  className,
  insetFrom = 8,
  scaleFrom = 1.05,
  rounded = 12,
}: Props) {
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref as React.RefObject<HTMLElement>,
    offset: ['start end', 'center center'],
  });

  const inset = useTransform(scrollYProgress, [0, 1], [reduced ? 0 : insetFrom, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [reduced ? 1 : scaleFrom, 1]);
  const clipPath = useTransform(inset, (v) => `inset(${v}% ${v}% ${v}% ${v}% round ${rounded}px)`);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ clipPath, WebkitClipPath: clipPath as unknown as string, scale }}
    >
      {children}
    </motion.div>
  );
}
