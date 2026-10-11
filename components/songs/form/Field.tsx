'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

type Props = {
  label: string;
  error?: string;
  /** Kept for callers; the Claude Design form marks required fields instead. */
  optional?: boolean;
  required?: boolean;
  /** Italic helper line under the control. */
  hint?: string;
  /** Used to link the error message to its field via aria-describedby. */
  fieldId?: string;
  /** When the field already holds a usable http(s) URL, pass it here to render
   * an "open" affordance in the label row. Callers must sanitise via
   * `openableHref` — this component trusts what it is given. */
  openHref?: string;
  /** Extra controls on the right of the label row (e.g. Generate / Enhance). */
  labelAction?: ReactNode;
  children: ReactNode;
};

/** Claude Design `FieldA`: sans uppercase label, gold star, italic hint below. */
export const Field = ({
  label,
  error,
  required,
  hint,
  fieldId,
  openHref,
  labelAction,
  children,
}: Props) => {
  const t = useTranslations('Songs');

  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span
          className="ui-field-label"
          data-required={required ? t('formRequiredSuffix') : undefined}
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--ink-3)',
            textTransform: 'uppercase',
            letterSpacing: '.12em',
            display: 'flex',
            gap: 4,
          }}
        >
          {label}
          {required && (
            <span className="ui-field-star" style={{ color: 'var(--gold-2)' }}>
              *
            </span>
          )}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {openHref && (
            <a
              href={openHref}
              target="_blank"
              rel="noopener noreferrer"
              title={openHref}
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                color: 'var(--gold-2)',
                textTransform: 'uppercase',
                letterSpacing: '.12em',
                textDecoration: 'none',
                borderBottom: '1px solid var(--gold-dim)',
              }}
            >
              {t('formOpenLinkLabel')} ↗
            </a>
          )}
          {labelAction}
        </span>
      </div>
      {children}
      {hint && (
        <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4, fontStyle: 'italic' }}>
          {hint}
        </div>
      )}
      {error && (
        <div
          id={fieldId ? `error-${fieldId}` : undefined}
          style={{ marginTop: 4, fontSize: 11, color: 'var(--danger)', fontFamily: 'var(--mono)' }}
        >
          {error}
        </div>
      )}
    </div>
  );
};
