'use client';

import { useTranslations } from 'next-intl';

type Section = { label: string; populated: number; total: number };

const cardStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--rule)',
  borderRadius: 'var(--radius-lg, 14px)',
  padding: '16px 20px',
  marginTop: 14,
};

/** Per-section field-completion summary, mirroring the mockup's sidebar tracker. */
export const SongFormCompletionTracker = ({ sections }: { sections: Section[] }) => {
  const t = useTranslations('Songs');

  return (
    <div style={cardStyle}>
      <div
        style={{
          color: 'var(--ink-4)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '.14em',
          fontWeight: 500,
          marginBottom: 10,
        }}
      >
        {t('formCompletionTitle')}
      </div>
      <div>
        {sections.map((s) => (
          <div
            key={s.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 0',
              borderBottom: '1px solid var(--rule)',
              fontSize: 12,
            }}
          >
            <span style={{ color: 'var(--ink-2)' }}>{s.label}</span>
            <span
              style={{
                fontFamily: 'var(--mono)',
                color: s.populated === s.total ? 'var(--success)' : 'var(--ink-4)',
              }}
            >
              {s.populated}/{s.total}
              {s.populated === s.total ? ' ✓' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
