import type { CSSProperties, ReactNode } from 'react';

/** Claude Design `Card`: white surface, rule border, 10px radius. */
export const DesignCard = ({
  children,
  style,
  testId,
}: {
  children: ReactNode;
  style?: CSSProperties;
  testId?: string;
}) => (
  <section
    data-testid={testId}
    style={{
      background: 'var(--card)',
      border: '1px solid var(--rule)',
      borderRadius: 10,
      overflow: 'hidden',
      minWidth: 0,
      ...style,
    }}
  >
    {children}
  </section>
);

/** Claude Design `CardHeader`: mono eyebrow over a 20px serif title, optional action right. */
export const DesignCardHeader = ({
  eyebrow,
  title,
  action,
  eyebrowColor = 'var(--ink-4)',
}: {
  eyebrow: string;
  title: ReactNode;
  action?: ReactNode;
  eyebrowColor?: string;
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
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: eyebrowColor,
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

/** Card body with the mockup's standard inset. */
export const DesignCardBody = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) => <div style={{ padding: '0 24px 22px', ...style }}>{children}</div>;
