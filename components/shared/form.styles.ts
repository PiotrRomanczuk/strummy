import type { CSSProperties } from 'react';

/**
 * Shared inline-style tokens for forms (lessons + assignments).
 * Mirrors the `.theme-strummy` token set used by the read surfaces.
 */
export const formStyles: Record<string, CSSProperties> = {
  page: {
    background: 'var(--ivory)',
    color: 'var(--ink)',
    fontSize: 13,
    lineHeight: 1.4,
    minHeight: '100%',
    padding: '28px 40px 120px',
  },
  shell: { maxWidth: 720, margin: '0 auto' },
  eyebrow: {
    fontFamily: 'var(--mono)',
    fontSize: 11,
    color: 'var(--ink-4)',
    textTransform: 'uppercase',
    letterSpacing: '.16em',
  },
  title: {
    margin: '6px 0 24px',
    fontFamily: 'var(--serif)',
    fontWeight: 400,
    fontSize: 40,
    letterSpacing: '-0.02em',
    fontStyle: 'italic',
  },
  field: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 },
  // Claude Design `LABEL_STYLE_F` / `FIELD_STYLE_F`.
  label: {
    fontFamily: 'var(--sans)',
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '.12em',
    color: 'var(--ink-3)',
  },
  input: {
    display: 'block',
    background: 'var(--card)',
    border: '1px solid var(--rule)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 13,
    color: 'var(--ink)',
    fontFamily: 'var(--sans, inherit)',
    width: '100%',
    outline: 'none',
  },
  textarea: {
    display: 'block',
    background: 'var(--card)',
    border: '1px solid var(--rule)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 13,
    lineHeight: 1.5,
    color: 'var(--ink)',
    minHeight: 100,
    fontFamily: 'var(--sans, inherit)',
    width: '100%',
    resize: 'vertical',
    outline: 'none',
  },
  actions: { display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 },
  primary: {
    background: 'var(--ink)',
    color: 'var(--ivory)',
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'var(--mono)',
    textTransform: 'uppercase',
    letterSpacing: '.08em',
  },
  cancel: {
    color: 'var(--ink-4)',
    textDecoration: 'none',
    fontFamily: 'var(--mono)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '.1em',
  },
  error: {
    color: 'var(--danger)',
    fontSize: 13,
    marginBottom: 16,
    fontFamily: 'var(--mono)',
  },
  hint: { fontSize: 11, color: 'var(--ink-4)', fontStyle: 'italic' },
  required: { color: 'var(--gold-2)', marginLeft: 4 },
};

/** Mockup "filled" state: a field holding a value turns gold-tinted. */
export const filledInput = (isFilled: boolean): CSSProperties =>
  isFilled
    ? { ...formStyles.input, background: 'var(--gold-tint)', borderColor: 'var(--gold-dim)' }
    : formStyles.input;
