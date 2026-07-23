/**
 * Presentational form primitives for the editorial onboarding wizard.
 * Client-safe: no server-only imports, so client steps can render them freely.
 * Interaction/focus styling lives in the `ed-onb-*` classes in
 * app/editorial-tokens.css — never inline.
 */
import type { ReactNode } from 'react';

export const OnbHeader = ({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) => (
  <div style={{ marginBottom: 28 }}>
    <div
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 11,
        color: 'var(--ink-4)',
        textTransform: 'uppercase',
        letterSpacing: '.14em',
        marginBottom: 8,
      }}
    >
      {eyebrow}
    </div>
    <h1
      style={{
        margin: '0 0 10px',
        fontFamily: 'var(--serif)',
        fontWeight: 400,
        fontSize: 38,
        letterSpacing: '-0.02em',
        lineHeight: 1.05,
      }}
    >
      {title}
    </h1>
    {sub && (
      <p
        style={{ margin: 0, fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.55, maxWidth: 520 }}
      >
        {sub}
      </p>
    )}
  </div>
);

export const OnbField = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) => (
  <div style={{ marginBottom: 18 }}>
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 6,
      }}
    >
      <label
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-3)',
          textTransform: 'uppercase',
          letterSpacing: '.12em',
          fontWeight: 500,
        }}
      >
        {label}
      </label>
      {hint && (
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
          {hint}
        </span>
      )}
    </div>
    {children}
  </div>
);

const controlBase: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid var(--rule)',
  borderRadius: 8,
  background: 'var(--card)',
  fontFamily: 'var(--sans)',
  fontSize: 15,
  color: 'var(--ink)',
  boxSizing: 'border-box',
};

export const OnbInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className="ed-onb-input" style={{ ...controlBase, ...props.style }} />
);

export const OnbTextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className="ed-onb-input"
    style={{ ...controlBase, resize: 'vertical', minHeight: 88, ...props.style }}
  />
);

export const OnbSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className="ed-onb-input" style={{ ...controlBase, ...props.style }}>
    {props.children}
  </select>
);
