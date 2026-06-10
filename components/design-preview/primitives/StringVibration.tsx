'use client';

import { useEffect, useRef, useState } from 'react';

type StringVibrationProps = {
  width?: number;
  height?: number;
  opacity?: number;
  color?: string;
  running?: boolean;
};

const LINES = [
  { y: 0.18, amp: 1.6, f: 1.7, ph: 0.0 },
  { y: 0.31, amp: 1.4, f: 1.4, ph: 0.6 },
  { y: 0.44, amp: 1.2, f: 1.9, ph: 1.2 },
  { y: 0.57, amp: 1.0, f: 1.5, ph: 1.8 },
  { y: 0.7, amp: 0.8, f: 1.3, ph: 2.4 },
  { y: 0.83, amp: 0.6, f: 1.8, ph: 3.0 },
];

export const StringVibration = ({
  width = 1000,
  height = 240,
  opacity = 0.12,
  color = 'var(--gold-2)',
  running = true,
}: StringVibrationProps) => {
  const [t, setT] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    const tick = (now: number) => {
      setT((now - start) / 1000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [running]);

  const samples = 32;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', pointerEvents: 'none' }}
    >
      {LINES.map((ln, idx) => {
        const baseY = ln.y * height;
        let d = `M 0 ${baseY}`;
        for (let i = 1; i <= samples; i++) {
          const x = (i / samples) * width;
          const env = Math.sin((i / samples) * Math.PI);
          const y = baseY + Math.sin((i / samples) * Math.PI * 6 + t * ln.f + ln.ph) * ln.amp * env;
          d += ` L ${x} ${y}`;
        }
        return (
          <path
            key={idx}
            d={d}
            stroke={color}
            strokeWidth={1 - idx * 0.07}
            fill="none"
            opacity={opacity * (1 - idx * 0.08)}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
};
