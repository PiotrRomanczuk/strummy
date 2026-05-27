'use client';

import { motion, type Variants } from 'framer-motion';
import { type ElementType, useMemo } from 'react';
import { easeCine, stagger as staggerConst } from './easings';
import { useReducedMotionSafe } from './useReducedMotionSafe';

type Tag = 'h1' | 'h2' | 'h3' | 'p' | 'span';

type Props = {
  text: string;
  as?: Tag;
  className?: string;
  stagger?: number;
  delay?: number;
  splitBy?: 'word' | 'char';
  once?: boolean;
};

export function TextReveal({
  text,
  as = 'h1',
  className,
  stagger = staggerConst.base,
  delay = 0,
  splitBy = 'word',
  once = true,
}: Props) {
  const reduced = useReducedMotionSafe();
  const pieces = useMemo(
    () => (splitBy === 'word' ? text.split(/(\s+)/) : Array.from(text)),
    [text, splitBy]
  );

  const container: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduced ? 0 : stagger,
        delayChildren: reduced ? 0 : delay,
      },
    },
  };

  // Opacity stays at 1 — words slide up from below. If the reveal never fires
  // (above-the-fold, fast scroll, no JS) the text is always readable.
  const item: Variants = {
    hidden: { y: reduced ? 0 : '0.45em' },
    show: {
      y: 0,
      transition: { duration: 0.75, ease: easeCine },
    },
  };

  const Component = motion[as] as ElementType;

  return (
    <Component
      className={className}
      aria-label={text}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount: 0.1, margin: '0px 0px -8% 0px' }}
      variants={container}
    >
      {pieces.map((piece, i) =>
        /^\s+$/.test(piece) ? (
          <span key={i} aria-hidden>
            {' '}
            {piece}{' '}
          </span>
        ) : (
          <motion.span key={i} variants={item} aria-hidden className="inline-block whitespace-pre">
            {piece}
          </motion.span>
        )
      )}
    </Component>
  );
}
