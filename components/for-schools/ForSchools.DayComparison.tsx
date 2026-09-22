import { getTranslations } from 'next-intl/server';

import { Display, LandingContainer } from '@/components/landing/Landing.primitives';

import { SCHOOL_ANCHORS, SCHOOL_DAY_TIMES } from './for-schools.data';

const Moment = ({ time, text, tone }: { time: string; text: string; tone: 'before' | 'after' }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: '58px minmax(0, 1fr)',
      gap: 14,
      padding: '13px 0',
      borderTop: `1px solid ${tone === 'after' ? 'var(--gold-dim)' : 'var(--rule)'}`,
    }}
  >
    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-4)', paddingTop: 2 }}>
      {time}
    </span>
    <p
      style={{
        margin: 0,
        fontSize: 15,
        lineHeight: 1.55,
        color: tone === 'after' ? 'var(--ink-2)' : 'var(--ink-3)',
        textWrap: 'pretty',
      }}
    >
      {text}
    </p>
  </div>
);

/**
 * The office's Thursday, before and after. Deliberately the same shape as the
 * landing page's day-in-the-life, one rung up: this one is the person running
 * the school, not the teacher.
 */
export const SchoolsDayComparison = async () => {
  const t = await getTranslations('ForSchools.days');

  const columns = [
    { tone: 'before' as const, title: t('beforeTitle'), tag: t('beforeTag'), prefix: 'before' },
    { tone: 'after' as const, title: t('afterTitle'), tag: t('afterTag'), prefix: 'after' },
  ];

  return (
    <div
      id={SCHOOL_ANCHORS.how}
      style={{ padding: '80px 0', background: 'var(--paper)', scrollMarginTop: 80 }}
    >
      <LandingContainer>
        <div style={{ maxWidth: '60ch', marginBottom: 40 }}>
          <Display sizeClass="ui-land-display-44">{t('heading')}</Display>
          <p style={{ margin: '14px 0 0', fontSize: 16, lineHeight: 1.6, color: 'var(--ink-3)' }}>
            {t('lede')}
          </p>
        </div>

        <div className="ui-land-cols-2" style={{ gap: 40 }}>
          {columns.map((col) => (
            <div key={col.prefix}>
              <h3
                style={{
                  margin: 0,
                  fontFamily: 'var(--serif)',
                  fontSize: 22,
                  fontWeight: 500,
                  color: col.tone === 'after' ? 'var(--gold-2)' : 'var(--ink)',
                }}
              >
                {col.title}
              </h3>
              <span
                style={{
                  display: 'block',
                  margin: '4px 0 20px',
                  fontSize: 13,
                  color: 'var(--ink-4)',
                }}
              >
                {col.tag}
              </span>
              {SCHOOL_DAY_TIMES.map((time, i) => (
                <Moment key={time} time={time} text={t(`${col.prefix}${i}`)} tone={col.tone} />
              ))}
            </div>
          ))}
        </div>
      </LandingContainer>
    </div>
  );
};
