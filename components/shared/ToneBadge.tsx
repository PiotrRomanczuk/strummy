import type { ReactNode } from 'react';

export type Tone = 'neutral' | 'gold' | 'success' | 'danger' | 'info';

/** Claude Design `TONES`: tinted background, coloured text, a slightly darker rule. */
export const TONE_STYLES: Record<Tone, { bg: string; fg: string; bd: string }> = {
  neutral: { bg: 'var(--ivory)', fg: 'var(--ink-3)', bd: 'var(--rule)' },
  gold: {
    bg: 'var(--gold-tint)',
    fg: 'var(--gold-2)',
    bd: 'color-mix(in srgb, var(--gold) 25%, var(--gold-tint))',
  },
  success: {
    bg: 'color-mix(in srgb, var(--success) 12%, var(--card))',
    fg: 'var(--success)',
    bd: 'color-mix(in srgb, var(--success) 25%, var(--card))',
  },
  danger: {
    bg: 'color-mix(in srgb, var(--danger) 12%, var(--card))',
    fg: 'var(--danger)',
    bd: 'color-mix(in srgb, var(--danger) 25%, var(--card))',
  },
  info: {
    bg: 'color-mix(in srgb, var(--info) 12%, var(--card))',
    fg: 'var(--info)',
    bd: 'color-mix(in srgb, var(--info) 25%, var(--card))',
  },
};

/** Claude Design `Badge`: rounded, tinted, optional leading icon. */
export const ToneBadge = ({
  tone = 'neutral',
  icon,
  children,
  testId,
  status,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  testId?: string;
  /** Mirrored to `data-status` for tests that key on it. */
  status?: string;
}) => {
  const t = TONE_STYLES[tone];
  return (
    <span
      data-testid={testId}
      data-status={status}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        borderRadius: 999,
        padding: '3px 9px',
        fontSize: 12,
        fontWeight: 500,
        fontFamily: 'var(--sans)',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {children}
    </span>
  );
};
