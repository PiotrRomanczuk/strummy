import type { ReactNode } from 'react';

const STATUS_KEYS: Record<string, string> = {
  SCHEDULED: 'statusScheduled',
  IN_PROGRESS: 'statusInProgress',
  COMPLETED: 'statusCompleted',
  CANCELLED: 'statusCancelled',
};

const STATUS_COLOURS: Record<string, string> = {
  SCHEDULED: 'var(--info)',
  IN_PROGRESS: 'var(--gold-2)',
  COMPLETED: 'var(--success)',
  CANCELLED: 'var(--ink-4)',
};

export const lessonStatusLabel = (
  s: string,
  t: (key: string) => string,
  scheduledAt?: string
): string => {
  if (s.toLowerCase() === 'scheduled' && scheduledAt && new Date(scheduledAt) < new Date()) {
    return t('statusOverdue') !== 'statusOverdue' ? t('statusOverdue') : 'Overdue';
  }
  const key = STATUS_KEYS[s] ?? STATUS_KEYS[s.toUpperCase()];
  return key ? t(key) : s;
};
export const lessonStatusColour = (s: string, scheduledAt?: string): string => {
  if (s.toLowerCase() === 'scheduled' && scheduledAt && new Date(scheduledAt) < new Date()) {
    return 'var(--warn)';
  }
  return STATUS_COLOURS[s] ?? STATUS_COLOURS[s.toUpperCase()] ?? 'var(--ink-4)';
};

export const formatLong = (iso: string): string =>
  new Date(iso).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

export const formatShortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const Card = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      background: 'var(--card)',
      border: '1px solid var(--rule)',
      borderRadius: 10,
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
    }}
  >
    {children}
  </div>
);

/** Claude Design `CardHeader`: no rule underneath, ink-4 eyebrow, 20px serif title. */
export const CardHeader = ({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: ReactNode;
  action?: ReactNode;
}) => (
  <div
    style={{
      padding: '20px 24px 12px',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 12,
    }}
  >
    <div>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--ink-4)',
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
          fontSize: 20,
          fontWeight: 400,
          letterSpacing: '-0.01em',
          marginTop: 2,
        }}
      >
        {title}
      </div>
    </div>
    {action}
  </div>
);

export const InfoRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr', alignItems: 'center', gap: 12 }}>
    <div
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 10,
        color: 'var(--ink-4)',
        textTransform: 'uppercase',
        letterSpacing: '.12em',
      }}
    >
      {label}
    </div>
    <div>{children}</div>
  </div>
);
