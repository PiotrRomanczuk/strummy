'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

type Props = {
  label: string;
  error?: string;
  optional?: boolean;
  /** Used to link the error message to its field via aria-describedby. */
  fieldId?: string;
  /** When the field already holds a usable http(s) URL, pass it here to render
   * an "open" affordance in the label row. Callers must sanitise via
   * `openableHref` — this component trusts what it is given. */
  openHref?: string;
  children: ReactNode;
};

export const Field = ({ label, error, optional, fieldId, openHref, children }: Props) => {
  const t = useTranslations('Songs');

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--ink-4)',
            textTransform: 'uppercase',
            letterSpacing: '.12em',
          }}
        >
          {label}
        </span>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
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
          {optional && (
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                color: 'var(--ink-5)',
                textTransform: 'uppercase',
                letterSpacing: '.12em',
              }}
            >
              {t('formOptionalLabel')}
            </span>
          )}
        </span>
      </div>
      {children}
      {error && (
        <div
          id={fieldId ? `error-${fieldId}` : undefined}
          style={{
            marginTop: 4,
            fontSize: 11,
            color: 'var(--danger)',
            fontFamily: 'var(--mono)',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};
