'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

type CountUpFormat = 'plain' | 'comma';

type CountUpProps = {
  to: number;
  duration?: number;
  format?: CountUpFormat;
  style?: CSSProperties;
};

const formatters: Record<CountUpFormat, (n: number) => string> = {
  plain: (n) => String(Math.round(n)),
  comma: (n) => Math.round(n).toLocaleString(),
};

export const CountUp = ({ to, duration = 900, format = 'plain', style }: CountUpProps) => {
  const [v, setV] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let start: number | undefined;
    const tick = (now: number) => {
      if (start === undefined) start = now;
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(to * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [to, duration]);

  return <span style={style}>{formatters[format](v)}</span>;
};
