import type { CSSProperties, ReactNode } from 'react';

/** This mockup's `Card`: 12px radius, soft shadow, optional serif header row. */
export const SdCard = ({
  title,
  action,
  children,
  pad = 20,
  style,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  pad?: number;
  style?: CSSProperties;
}) => (
  <div
    style={{
      background: 'var(--card)',
      border: '1px solid var(--rule)',
      borderRadius: 12,
      boxShadow: '0 1px 2px rgba(26,22,19,.04)',
      overflow: 'hidden',
      ...style,
    }}
  >
    {title && (
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--rule)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500 }}>{title}</span>
        {action}
      </div>
    )}
    <div style={{ padding: title ? 0 : pad }}>{children}</div>
  </div>
);

/** One row of an activity / notes list inside an `SdCard`. */
export const SdRow = ({ children, isLast }: { children: ReactNode; isLast: boolean }) => (
  <div
    style={{
      display: 'flex',
      gap: 14,
      padding: '14px 20px',
      borderBottom: isLast ? 'none' : '1px solid var(--rule-2)',
    }}
  >
    {children}
  </div>
);
