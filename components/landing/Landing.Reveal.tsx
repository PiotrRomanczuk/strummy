'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

import { hoverLift, safeMotionProps, safeVariants } from '@/lib/animations/variants';

/** Fades + slides a section in once it scrolls into view. Client island around server-rendered children. */
export const LandingReveal = ({
  children,
  delay = 0,
  y = 24,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
}) => (
  <motion.div
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.3 }}
    variants={safeVariants({
      hidden: { opacity: 0, y },
      visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut', delay } },
    })}
  >
    {children}
  </motion.div>
);

/** Subtle lift + scale on hover, for feature shots and cards. */
export const LandingHoverLift = ({ children }: { children: ReactNode }) => (
  <motion.div {...safeMotionProps(hoverLift)}>{children}</motion.div>
);
