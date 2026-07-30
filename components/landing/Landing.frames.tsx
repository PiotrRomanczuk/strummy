import type { ReactNode } from 'react';
import Image from 'next/image';

/** Honest placeholder frame for screenshots we haven't produced yet. */
export const Placeholder = ({
  label,
  note = 'screenshot',
  height = 400,
}: {
  label: string;
  note?: string;
  height?: number;
}) => (
  <div
    style={{
      width: '100%',
      height,
      position: 'relative',
      background: `repeating-linear-gradient(135deg,
        var(--rule-2) 0px, var(--rule-2) 1px,
        transparent 1px, transparent 9px)`,
      backgroundColor: 'var(--paper)',
      border: '1px solid var(--rule)',
      borderRadius: 12,
      display: 'grid',
      placeItems: 'center',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        padding: '10px 16px',
        border: '1px solid var(--rule)',
        background: 'var(--card)',
        borderRadius: 8,
        fontFamily: 'var(--mono)',
        fontSize: 12,
        color: 'var(--ink-3)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        textAlign: 'center',
      }}
    >
      <span
        style={{
          color: 'var(--gold-2)',
          fontSize: 10,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
        }}
      >
        {note}
      </span>
      <span>{label}</span>
    </div>
  </div>
);

/** Browser chrome around a product shot. */
export const BrowserFrame = ({
  children,
  url = 'strummy.online',
  height,
}: {
  children: ReactNode;
  url?: string;
  height?: number;
}) => (
  <div
    style={{
      width: '100%',
      borderRadius: 14,
      overflow: 'hidden',
      background: 'var(--card)',
      border: '1px solid var(--rule)',
      boxShadow: '0 20px 40px -20px rgba(26,22,19,.18), 0 8px 18px -10px rgba(26,22,19,.10)',
    }}
  >
    <div
      style={{
        height: 34,
        padding: '0 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderBottom: '1px solid var(--rule)',
        background: 'var(--paper)',
      }}
    >
      <div style={{ display: 'flex', gap: 6 }}>
        {['#e0726a', '#e6b64b', '#7abf7a'].map((c) => (
          <span
            key={c}
            style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.85 }}
          />
        ))}
      </div>
      <div
        style={{
          flex: 1,
          maxWidth: 340,
          margin: '0 auto',
          height: 22,
          borderRadius: 6,
          background: 'var(--card)',
          border: '1px solid var(--rule)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 10px',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-4)',
        }}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        <span>{url}</span>
      </div>
      <div style={{ width: 44 }} />
    </div>
    <div style={{ height, background: 'var(--ivory)' }}>{children}</div>
  </div>
);

/** A real product screenshot (1440x900 capture) inside the browser chrome. */
export const ScreenshotShot = ({ src, alt, url }: { src: string; alt: string; url: string }) => (
  <BrowserFrame url={url}>
    <Image
      src={src}
      alt={alt}
      width={1440}
      height={900}
      sizes="(max-width: 900px) 100vw, 640px"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    />
  </BrowserFrame>
);
