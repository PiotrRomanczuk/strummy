'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { PickMark } from '@/components/shared/BrandMark';
import { cn } from '@/lib/utils';

interface AuthLayoutProps {
  children: React.ReactNode;
  className?: string;
  /** Card width; the role picker uses a wider card. */
  width?: number;
}

/** Faint five-line staff behind the card, from the Claude Design auth screens. */
const StaffLines = () => (
  <svg
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 h-full w-full"
    preserveAspectRatio="none"
    viewBox="0 0 100 100"
  >
    {[0, 1].map((block) =>
      [0, 1, 2, 3, 4].map((line) => (
        <line
          key={`${block}-${line}`}
          x1="0"
          x2="100"
          y1={14 + block * 48 + line * 4}
          y2={14 + block * 48 + line * 4}
          stroke="var(--rule-2)"
          strokeWidth="0.15"
          vectorEffect="non-scaling-stroke"
        />
      ))
    )}
  </svg>
);

/**
 * Claude Design `AuthCard` on `AuthBg`: an ivory page with faint staff lines and
 * one white card carrying the Strummy brand. Shared by every auth page.
 */
function AuthLayout({ children, className, width = 440 }: AuthLayoutProps) {
  return (
    <div
      className="relative flex min-h-screen w-full flex-col items-center justify-center p-4"
      style={{ background: 'var(--ivory)', color: 'var(--ink)', fontFamily: 'var(--sans)' }}
    >
      <StaffLines />
      <Link
        href="/"
        className="absolute left-4 top-4 flex items-center gap-2 sm:left-6 sm:top-6"
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '.12em',
          textDecoration: 'none',
        }}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to home</span>
      </Link>

      <div
        className={cn('ui-auth relative flex w-full flex-col gap-5', className)}
        style={{
          maxWidth: width,
          background: 'var(--card)',
          border: '1px solid var(--rule)',
          borderRadius: 14,
          padding: '40px 36px',
          boxShadow: '0 24px 60px -28px rgba(26,22,19,.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-2) 100%)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: 'inset 0 -1px 0 rgba(0,0,0,.15)',
            }}
          >
            <PickMark size={18} stroke="#fff" />
          </div>
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 21,
              fontWeight: 500,
              letterSpacing: '-0.01em',
            }}
          >
            Strummy
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

interface AuthHeaderProps {
  title: React.ReactNode;
  subtitle?: string;
  /** Mono eyebrow above the title ("Welcome back"). */
  eyebrow?: string;
}

/** Eyebrow, serif title (callers italicise the accent word) and a muted line. */
function AuthHeader({ title, subtitle, eyebrow }: AuthHeaderProps) {
  return (
    <div>
      {eyebrow && (
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--ink-4)',
            textTransform: 'uppercase',
            letterSpacing: '.14em',
            marginBottom: 6,
          }}
        >
          {eyebrow}
        </div>
      )}
      <h1
        style={{
          margin: '0 0 8px',
          fontFamily: 'var(--serif)',
          fontWeight: 400,
          fontSize: 34,
          letterSpacing: '-0.02em',
          lineHeight: 1.05,
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-4)', lineHeight: 1.55 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** "— OR —" rule between auth methods. */
function AuthDivider({ text = 'or' }: { text?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '.12em',
        }}
      >
        {text}
      </span>
      <span style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
    </div>
  );
}

/** Accent word in an auth title: "Sign *in*." */
const AuthAccent = ({ children }: { children: React.ReactNode }) => (
  <em style={{ fontStyle: 'italic', color: 'var(--gold-2)' }}>{children}</em>
);

export { AuthLayout, AuthHeader, AuthDivider, AuthAccent };
