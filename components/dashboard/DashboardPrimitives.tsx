import type { CSSProperties, ReactNode } from 'react';

export const Card = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div
    style={{
      background: 'var(--card)',
      border: '1px solid var(--rule)',
      borderRadius: 18,
      boxShadow: '0 1px 2px rgba(26,22,19,.04), 0 10px 40px -20px rgba(26,22,19,.08)',
      overflow: 'hidden',
      ...style,
    }}
  >
    {children}
  </div>
);

export const CardHeader = ({
  eyebrow,
  title,
  action,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  action?: ReactNode;
}) => (
  <div
    style={{
      padding: '20px 24px 12px',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      borderBottom: '1px solid var(--rule)',
    }}
  >
    <div>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--gold-2)',
          textTransform: 'uppercase',
          letterSpacing: '.14em',
          fontWeight: 500,
        }}
      >
        {eyebrow}
      </div>
      <div
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 22,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          marginTop: 2,
        }}
      >
        {title}
      </div>
    </div>
    {action}
  </div>
);

export const ComingSoonBody = ({ note }: { note: string }) => (
  <div
    style={{
      padding: '22px 24px 24px',
      fontFamily: 'var(--serif)',
      fontSize: 14,
      fontStyle: 'italic',
      color: 'var(--ink-4)',
      lineHeight: 1.5,
    }}
  >
    {note}
  </div>
);

/** One avatar everywhere: re-export the Claude Design swatch avatar (rule S3). */
export { StudentInitials } from '@/components/lessons/LessonPrimitives';

export const PulseDot = ({
  color = 'var(--gold-2)',
  size = 8,
}: {
  color?: string;
  size?: number;
}) => (
  <span
    style={{ position: 'relative', display: 'inline-flex', width: size, height: size }}
    aria-hidden="true"
  >
    <span
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: color,
        opacity: 0.45,
        animation: 'strummy-pulse 1.8s ease-out infinite',
      }}
    />
    <span
      style={{ position: 'absolute', inset: size * 0.2, borderRadius: '50%', background: color }}
    />
  </span>
);

/** Six faint strings across the hero — a still frame of the mockup's vibration. */
export const StringWaves = () => {
  const width = 1400;
  const height = 380;
  const paths = Array.from({ length: 6 }, (_, i) => {
    const y = 60 + i * 52;
    const amp = 6 - i * 0.8;
    const pts = Array.from({ length: 29 }, (__, k) => {
      const x = (k / 28) * width;
      return `${x.toFixed(0)},${(y + Math.sin(k * 0.9 + i) * amp).toFixed(1)}`;
    });
    return `M${pts.join(' L')}`;
  });
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity: 0.055,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="var(--gold-2)" strokeWidth={1.2 - i * 0.1} />
      ))}
    </svg>
  );
};
