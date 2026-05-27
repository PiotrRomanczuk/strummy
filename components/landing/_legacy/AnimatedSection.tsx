'use client';

import { motion, type MotionProps } from 'framer-motion';

interface AnimatedSectionProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function AnimatedSection({ children, className, delay = 0, ...rest }: AnimatedSectionProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
