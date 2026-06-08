'use client';

import { useEffect, useState } from 'react';

type ProgressBarProps = {
  value?: number;
  max?: number;
  color?: string;
  height?: number;
  delay?: number;
  label?: string;
};

export const ProgressBar = ({
  value = 0,
  max = 100,
  color = 'var(--gold-2)',
  height = 4,
  delay = 0,
  label,
}: ProgressBarProps) => {
  const [w, setW] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setW((value / max) * 100), 80 + delay);
    return () => clearTimeout(id);
  }, [value, max, delay]);

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 4,
            fontSize: 11,
            color: 'var(--ink-3)',
            fontFamily: 'var(--mono)',
          }}
        >
          <span>{label}</span>
          <span>{Math.round((value / max) * 100)}%</span>
        </div>
      )}
      <div
        style={{
          height,
          background: 'var(--rule-2)',
          borderRadius: height,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${w}%`,
            background: color,
            borderRadius: height,
            transition: 'width 1.1s cubic-bezier(.22,.61,.36,1)',
          }}
        />
      </div>
    </div>
  );
};
