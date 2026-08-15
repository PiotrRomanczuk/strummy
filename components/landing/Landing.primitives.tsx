import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

import { PickMark } from '@/components/shared/BrandMark';
import { HEALTH_COLOR, type SampleStudent } from './landing.data';

export const LandingContainer = ({ children }: { children: ReactNode }) => (
  <div className="ui-land-container">{children}</div>
);

export const SectionKicker = ({
  children,
  align = 'left',
}: {
  children: ReactNode;
  align?: 'left' | 'center';
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      justifyContent: align === 'center' ? 'center' : 'flex-start',
      color: 'var(--gold-2)',
      fontFamily: 'var(--mono)',
      fontSize: 11,
      letterSpacing: '.22em',
      textTransform: 'uppercase',
      marginBottom: 14,
    }}
  >
    <span style={{ width: 18, height: 1, background: 'var(--gold)' }} />
    <span>{children}</span>
    <span style={{ width: 18, height: 1, background: 'var(--gold)' }} />
  </div>
);

/** Display serif heading. `sizeClass` maps to the clamp() classes in design-tokens.css. */
export const Display = ({
  children,
  sizeClass = 'ui-land-display-48',
  align = 'left',
  style,
}: {
  children: ReactNode;
  sizeClass?: string;
  align?: 'left' | 'center';
  style?: CSSProperties;
}) => (
  <h2
    className={sizeClass}
    style={{
      margin: 0,
      fontFamily: 'var(--serif)',
      fontWeight: 400,
      lineHeight: 1.02,
      letterSpacing: '-0.028em',
      textAlign: align,
      color: 'var(--ink)',
      textWrap: 'balance',
      ...style,
    }}
  >
    {children}
  </h2>
);

export const Eyebrow = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div
    style={{
      fontFamily: 'var(--mono)',
      fontSize: 11,
      letterSpacing: '.22em',
      textTransform: 'uppercase',
      color: 'var(--ink-4)',
      ...style,
    }}
  >
    {children}
  </div>
);

/** CTA link styled as the landing's pill button (variants live in design-tokens.css). */
export const CtaLink = ({
  href,
  children,
  variant = 'primary',
  size = 'md',
  style,
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'ghost';
  size?: 'md' | 'lg';
  style?: CSSProperties;
}) => {
  const className = `ui-land-btn ui-land-btn--${variant}${size === 'lg' ? ' is-lg' : ''}`;
  const isInternal = href.startsWith('/');
  if (isInternal) {
    return (
      <Link href={href} className={className} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      className={className}
      style={style}
      {...(href.startsWith('#') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
    >
      {children}
    </a>
  );
};

export const ArrowRight = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);

export const PlayGlyph = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="6,4 20,12 6,20" />
  </svg>
);

export const Wordmark = ({ fontSize = 22 }: { fontSize?: number }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: fontSize * 0.22 }}>
    <PickMark size={Math.round(fontSize * 0.9)} />
    <span
      style={{
        fontFamily: 'var(--serif)',
        fontWeight: 500,
        fontSize,
        letterSpacing: '-0.02em',
        color: 'var(--ink)',
      }}
    >
      Strummy
    </span>
  </span>
);

export const SampleAvatar = ({ s, size = 32 }: { s: SampleStudent; size?: number }) => (
  <span
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: s.color,
      color: '#fff',
      display: 'inline-grid',
      placeItems: 'center',
      fontSize: size * 0.38,
      fontWeight: 600,
      flex: '0 0 auto',
      fontFamily: 'var(--sans)',
    }}
  >
    {s.avatar}
  </span>
);

export const HealthDot = ({
  health,
  size = 8,
}: {
  health: SampleStudent['health'];
  size?: number;
}) => (
  <span
    style={{
      display: 'inline-block',
      width: size,
      height: size,
      borderRadius: '50%',
      background: HEALTH_COLOR[health],
    }}
  />
);
