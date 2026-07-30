import { getTranslations } from 'next-intl/server';

/** Repertoire + practice/notes panels inside the feature-01 student-profile shot. */

const CARD: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--rule)',
  borderRadius: 10,
};

const REPERTOIRE = [
  { title: 'Blackbird', author: 'The Beatles', status: 'started', tone: 'var(--gold-2)', key: 'G' },
  {
    title: 'Landslide',
    author: 'Fleetwood Mac',
    status: 'remembered',
    tone: 'var(--gold-2)',
    key: 'C',
  },
  {
    title: 'Classical Gas',
    author: 'Mason Williams',
    status: 'toLearn',
    tone: 'var(--ink-4)',
    key: 'Am',
  },
  {
    title: 'Dust in the Wind',
    author: 'Kansas',
    status: 'mastered',
    tone: 'var(--success)',
    key: 'C',
  },
] as const;

const PRACTICE_BARS = [18, 24, 12, 30, 22, 36, 28, 40, 34, 26, 32, 38, 44, 40];

export const FeatureShotPanels = async () => {
  const t = await getTranslations('Landing.featureShotPanels');
  const statusLabel: Record<(typeof REPERTOIRE)[number]['status'], string> = {
    started: t('statusStarted'),
    remembered: t('statusRemembered'),
    toLearn: t('statusToLearn'),
    mastered: t('statusMastered'),
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 10 }}>
      <div style={{ ...CARD, padding: '12px 14px' }}>
        <div
          style={{
            color: 'var(--ink-4)',
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '.14em',
            marginBottom: 8,
            fontWeight: 500,
          }}
        >
          {t('repertoireLabel')}
        </div>
        {REPERTOIRE.map((sg, i) => (
          <div
            key={sg.title}
            style={{
              display: 'grid',
              gridTemplateColumns: '24px 1fr auto',
              gap: 10,
              padding: '7px 0',
              borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
              borderBottom: '1px solid var(--rule)',
              alignItems: 'center',
            }}
          >
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--gold-2)' }}>
              {sg.key}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontSize: 12 }}>
                {sg.title}
              </div>
              <div style={{ fontSize: 9, color: 'var(--ink-4)' }}>{sg.author}</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 500, color: sg.tone }}>
              {statusLabel[sg.status]}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ ...CARD, padding: '12px 14px' }}>
          <div
            style={{
              color: 'var(--ink-4)',
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '.14em',
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            {t('practiceLabel')}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 40 }}>
            {PRACTICE_BARS.map((v, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${(v / 44) * 100}%`,
                  background: i >= 12 ? 'var(--gold)' : 'var(--ink-5)',
                  borderRadius: 1.5,
                }}
              />
            ))}
          </div>
        </div>
        <div style={{ ...CARD, padding: '12px 14px' }}>
          <div
            style={{
              color: 'var(--ink-4)',
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '.14em',
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            {t('lessonNotesLabel')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            <em style={{ fontFamily: 'var(--serif)', fontSize: 12 }}>{t('lessonNoteQuote')}</em>
          </div>
        </div>
      </div>
    </div>
  );
};
