import type { MotionValue } from 'framer-motion';

export type CollageItem = {
  src: string;
  alt: string;
  w: number;
  h: number;
  x: number;
  y: number;
  rotate: number;
  z: number;
  parallaxSpeed?: number;
  tilt?: boolean;
  priority?: boolean;
  rounded?: number;
};

export type ParallaxRange = readonly [number, number];

export type RevealProps = {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
  delay?: number;
  once?: boolean;
  amount?: number;
};

export type SectionScroll = {
  scrollYProgress: MotionValue<number>;
};
