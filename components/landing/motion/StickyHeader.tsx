'use client';

import { type ReactNode, useState } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { easeSnap } from './easings';

type Props = {
  children: ReactNode;
  threshold?: number;
  className?: string;
};

export function StickyHeader({ children, threshold = 24, className }: Props) {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setSolid(latest > threshold);
  });

  return (
    <motion.header
      className={className}
      initial={false}
      animate={{
        backgroundColor: solid ? 'rgba(251, 248, 241, 0.85)' : 'rgba(251, 248, 241, 0)',
        backdropFilter: solid ? 'blur(12px)' : 'blur(0px)',
        borderBottomColor: solid ? 'rgba(230, 220, 203, 1)' : 'rgba(230, 220, 203, 0)',
      }}
      transition={{ duration: 0.3, ease: easeSnap }}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottomWidth: 1,
        borderBottomStyle: 'solid',
      }}
    >
      {children}
    </motion.header>
  );
}
