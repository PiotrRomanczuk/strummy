// Shared presentational primitives for the Settings page shell and its
// sub-sections (Card/CardHeader/FieldLabel + input styles). Split out of
// Settings.tsx to keep component files under the 200-line limit.

export const Card = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      background: 'var(--card)',
      border: '1px solid var(--rule)',
      borderRadius: 10,
      overflow: 'hidden',
    }}
  >
    {children}
  </div>
);

export const CardHeader = ({ eyebrow, title }: { eyebrow: string; title: string }) => (
  <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid var(--rule)' }}>
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
);

export const FieldLabel = ({ label }: { label: string }) => (
  <div
    style={{
      fontFamily: 'var(--mono)',
      fontSize: 10,
      color: 'var(--ink-4)',
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      marginBottom: 6,
    }}
  >
    {label}
  </div>
);

export const readonlyInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--rule)',
  borderRadius: 6,
  background: 'var(--paper)',
  fontFamily: 'var(--mono)',
  fontSize: 13,
  color: 'var(--ink-3)',
};

export const editableInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--rule)',
  borderRadius: 6,
  background: 'var(--paper)',
  fontFamily: 'var(--sans)',
  fontSize: 14,
  color: 'var(--ink)',
};
