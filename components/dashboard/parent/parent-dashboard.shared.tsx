/**
 * Presentation-only primitives for the parent Family portal. No server imports,
 * so they stay safe to render in the component test and (if ever needed) a
 * client bundle. Interaction/responsive concerns live in design-tokens.css.
 */

import type { CSSProperties, ReactNode } from 'react';

export type BadgeTone = 'success' | 'gold' | 'warn' | 'danger' | 'neutral';

const TONE_COLOR: Record<BadgeTone, string> = {
  success: 'var(--success)',
  gold: 'var(--gold-2)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  neutral: 'var(--ink-4)',
};

export const Badge = ({ tone, children }: { tone: BadgeTone; children: ReactNode }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--mono)',
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: '.04em',
      color: TONE_COLOR[tone],
      border: '1px solid var(--rule)',
      borderRadius: 999,
      padding: '3px 10px',
      whiteSpace: 'nowrap',
    }}
  >
    <span
      aria-hidden
      style={{ width: 6, height: 6, borderRadius: '50%', background: TONE_COLOR[tone] }}
    />
    {children}
  </span>
);

export const SectionLabel = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) => (
  <div
    style={{
      fontFamily: 'var(--mono)',
      fontSize: 10,
      color: 'var(--ink-4)',
      textTransform: 'uppercase',
      letterSpacing: '.16em',
      ...style,
    }}
  >
    {children}
  </div>
);

export const StatChip = ({
  value,
  label,
  tone = 'neutral',
  icon,
}: {
  value: string;
  label: string;
  tone?: BadgeTone;
  /** Small icon above the value (Claude Design family portal tiles). */
  icon?: ReactNode;
}) => (
  <div
    style={{
      background: 'var(--card)',
      border: '1px solid var(--rule)',
      borderRadius: 12,
      padding: '14px 20px',
      textAlign: 'center',
      minWidth: 104,
    }}
  >
    {icon && (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 8,
          color: TONE_COLOR[tone],
        }}
      >
        {icon}
      </div>
    )}
    <div
      style={{
        fontFamily: 'var(--serif)',
        fontSize: 26,
        fontWeight: 500,
        lineHeight: 1,
        color: 'var(--ink)',
      }}
    >
      {value}
    </div>
    <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6 }}>{label}</div>
  </div>
);

/** Lessons happen in Warsaw; the server renders in UTC, so the zone is explicit. */
const LESSON_TIME_ZONE = 'Europe/Warsaw';
const intlLocale = (locale: string) => (locale.startsWith('pl') ? 'pl-PL' : 'en-US');

export const formatLessonDate = (
  iso: string,
  locale: string
): { mo: string; day: string; time: string; weekday: string } => {
  const d = new Date(iso);
  const tag = intlLocale(locale);
  const zone = { timeZone: LESSON_TIME_ZONE };
  return {
    mo: d.toLocaleDateString(tag, { month: 'short', ...zone }).toUpperCase(),
    day: d.toLocaleDateString(tag, { day: '2-digit', ...zone }),
    time: d.toLocaleTimeString(tag, { hour: 'numeric', minute: '2-digit', ...zone }),
    weekday: d.toLocaleDateString(tag, { weekday: 'short', ...zone }),
  };
};

export const formatNoteDate = (iso: string, locale: string): string =>
  new Date(iso).toLocaleDateString(intlLocale(locale), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: LESSON_TIME_ZONE,
  });
