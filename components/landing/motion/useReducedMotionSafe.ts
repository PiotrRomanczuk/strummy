'use client';

import { useReducedMotion } from 'framer-motion';

export function useReducedMotionSafe(): boolean {
  const prefers = useReducedMotion();
  return prefers ?? false;
}
