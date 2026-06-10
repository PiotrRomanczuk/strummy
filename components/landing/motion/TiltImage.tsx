'use client';

import Image from 'next/image';
import { type CSSProperties, type PointerEvent, useCallback, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useReducedMotionSafe } from './useReducedMotionSafe';

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  maxTilt?: number;
  className?: string;
  priority?: boolean;
  rounded?: number;
  sizes?: string;
  style?: CSSProperties;
};

export function TiltImage({
  src,
  alt,
  width,
  height,
  maxTilt = 7,
  className,
  priority,
  rounded = 10,
  sizes,
  style,
}: Props) {
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLDivElement | null>(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  const rotateX = useTransform(py, [-0.5, 0.5], [maxTilt, -maxTilt]);
  const rotateY = useTransform(px, [-0.5, 0.5], [-maxTilt, maxTilt]);
  const springConfig = { stiffness: 140, damping: 18, mass: 0.5 };
  const sx = useSpring(rotateX, springConfig);
  const sy = useSpring(rotateY, springConfig);

  const onMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (reduced) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      px.set((e.clientX - rect.left) / rect.width - 0.5);
      py.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [px, py, reduced]
  );

  const onLeave = useCallback(() => {
    px.set(0);
    py.set(0);
  }, [px, py]);

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={className}
      style={{
        rotateX: reduced ? 0 : sx,
        rotateY: reduced ? 0 : sy,
        transformStyle: 'preserve-3d',
        borderRadius: rounded,
        overflow: 'hidden',
        ...style,
      }}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
        className="block h-full w-full object-cover"
      />
    </motion.div>
  );
}
