'use client';

import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import { easeCine, stagger as staggerConst } from './easings';
import { useReducedMotionSafe } from './useReducedMotionSafe';

type Props = {
  children: ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
  delay?: number;
  once?: boolean;
  amount?: number;
  as?: 'div' | 'section' | 'ul' | 'ol' | 'header' | 'article';
};

export function ScrollReveal({
  children,
  className,
  stagger = staggerConst.base,
  y = 24,
  delay = 0,
  once = true,
  amount = 0.1,
  as = 'div',
}: Props) {
  const reduced = useReducedMotionSafe();

  const container: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduced ? 0 : stagger,
        delayChildren: reduced ? 0 : delay,
      },
    },
  };

  // Content is ALWAYS at full opacity. The reveal is a y-shift only. This
  // guarantees readability even if IntersectionObserver never fires (above-the-
  // fold mount, fast scroll, anchor jump, crawler, print, screenshot tool).
  const item: Variants = {
    hidden: { y: reduced ? 0 : y },
    show: {
      y: 0,
      transition: { duration: 0.7, ease: easeCine },
    },
  };

  const Component = motion[as];

  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount, margin: '0px 0px -8% 0px' }}
      variants={container}
    >
      {wrapChildren(children, item)}
    </Component>
  );
}

function wrapChildren(children: ReactNode, item: Variants): ReactNode {
  if (Array.isArray(children)) {
    return children.map((child, i) => (
      <motion.div key={i} variants={item}>
        {child}
      </motion.div>
    ));
  }
  return <motion.div variants={item}>{children}</motion.div>;
}
