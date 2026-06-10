'use client';

import Image from 'next/image';
import { type CSSProperties, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { TiltImage } from './TiltImage';
import { useReducedMotionSafe } from './useReducedMotionSafe';
import type { CollageItem } from './types';

type Props = {
  items: CollageItem[];
  className?: string;
  /** Container aspect ratio, e.g. '4/5'. Required to avoid CLS. */
  aspect?: string;
  /** Disable parallax below this breakpoint key. CSS media query. */
  mobileBreakpoint?: number;
};

export function PhotoCollage({ items, className, aspect = '4/5' }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <div ref={ref} className={className} style={{ position: 'relative', aspectRatio: aspect }}>
      {items.map((item, i) => (
        <CollageLayer key={i} item={item} containerRef={ref} />
      ))}
    </div>
  );
}

function CollageLayer({
  item,
  containerRef,
}: {
  item: CollageItem;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const reduced = useReducedMotionSafe();
  const { scrollYProgress } = useScroll({
    target: containerRef as React.RefObject<HTMLElement>,
    offset: ['start end', 'end start'],
  });

  const speed = item.parallaxSpeed ?? 0;
  const distance = reduced ? 0 : speed * 200;
  const y = useTransform(scrollYProgress, [0, 1], [-distance, distance]);

  const style: CSSProperties = {
    position: 'absolute',
    left: `${item.x}%`,
    top: `${item.y}%`,
    width: `${item.w}%`,
    zIndex: item.z,
    transform: `rotate(${item.rotate}deg)`,
    aspectRatio: `${item.w} / ${item.h}`,
  };

  return (
    <motion.div style={{ ...style, y }} className="will-change-transform">
      {item.tilt ? (
        <TiltImage
          src={item.src}
          alt={item.alt}
          width={item.w * 10}
          height={item.h * 10}
          priority={item.priority}
          rounded={item.rounded ?? 12}
          sizes="(max-width: 768px) 60vw, 30vw"
          className="h-full w-full shadow-[0_30px_60px_-30px_rgba(26,22,19,0.45)]"
        />
      ) : (
        <div
          style={{ borderRadius: item.rounded ?? 12, overflow: 'hidden' }}
          className="h-full w-full shadow-[0_30px_60px_-30px_rgba(26,22,19,0.45)]"
        >
          <Image
            src={item.src}
            alt={item.alt}
            width={item.w * 10}
            height={item.h * 10}
            priority={item.priority}
            sizes="(max-width: 768px) 60vw, 30vw"
            className="block h-full w-full object-cover"
          />
        </div>
      )}
    </motion.div>
  );
}
