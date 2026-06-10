'use client';

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotionSafe } from './useReducedMotionSafe';

type Props = {
  children: ReactNode;
  duration?: number;
  className?: string;
};

export function Marquee({ children, duration = 40, className }: Props) {
  const reduced = useReducedMotionSafe();
  return (
    <div className={`overflow-hidden ${className ?? ''}`}>
      <motion.div
        className="flex w-max gap-16"
        animate={reduced ? undefined : { x: ['0%', '-50%'] }}
        transition={{
          duration,
          ease: 'linear',
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        <div className="flex shrink-0 items-center gap-16">{children}</div>
        <div className="flex shrink-0 items-center gap-16" aria-hidden>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
