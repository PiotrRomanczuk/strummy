import { getTranslations } from 'next-intl/server';

import { HERO_AGENDA } from './landing.data';
import { HeroSidebar, HeroStatsRow, HeroTopbar } from './Landing.HeroDashboard.Chrome';
import { HealthDot, SampleAvatar } from './Landing.primitives';

const CARD: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--rule)',
  borderRadius: 8,
};

/** Static mock of the teacher dashboard, sized for the hero's browser frame. */
export const HeroDashboard = async () => {
  const t = await getTranslations('Landing.heroDashboard');

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: 'var(--ivory)',
        color: 'var(--ink)',
        fontSize: 12,
        lineHeight: 1.4,
        overflow: 'hidden',
        textAlign: 'left',
      }}
    >
      <HeroSidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <HeroTopbar />
        <div
          style={{ flex: 1, padding: '22px 24px', background: 'var(--ivory)', overflow: 'hidden' }}
        >
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                color: 'var(--ink-4)',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '.18em',
                fontFamily: 'var(--mono)',
                marginBottom: 4,
              }}
            >
              {t('date')}
            </div>
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 26,
                letterSpacing: '-0.02em',
                lineHeight: 1.05,
              }}
            >
              {t('greetingPrefix')}
              <em style={{ color: 'var(--gold-2)' }}>Sarah</em>
              {t('greetingSuffix')}
            </div>
          </div>

          <HeroStatsRow />

          <div style={{ ...CARD, padding: '14px 18px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                paddingBottom: 8,
                borderBottom: '1px solid var(--rule)',
              }}
            >
              <div>
                <div
                  style={{
                    color: 'var(--ink-4)',
                    fontSize: 9,
                    textTransform: 'uppercase',
                    letterSpacing: '.14em',
                    fontWeight: 500,
                  }}
                >
                  {t('agendaLabel')}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 16,
                    letterSpacing: '-0.01em',
                    marginTop: 2,
                  }}
                >
                  {t('agendaSummary')}
                </div>
              </div>
              <span style={{ color: 'var(--ink-4)', fontSize: 10 }}>{t('openCalendar')}</span>
            </div>

            {HERO_AGENDA.map((l, idx) => (
              <div
                key={l.time}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '54px 1fr auto',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: idx === HERO_AGENDA.length - 1 ? 'none' : '1px solid var(--rule)',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500 }}>
                    {l.time}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
                    {l.dur}
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <SampleAvatar s={l.student} size={22} />
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{l.student.name}</div>
                    <HealthDot health={l.student.health} size={6} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 30 }}>
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 10,
                        color: 'var(--gold-2)',
                        padding: '1px 5px',
                        border: '1px solid var(--gold-dim)',
                        borderRadius: 3,
                      }}
                    >
                      {l.key}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--serif)',
                        fontStyle: 'italic',
                        fontSize: 12,
                        color: 'var(--ink-2)',
                      }}
                    >
                      {l.song}
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    padding: '5px 12px',
                    border: '1px solid var(--rule)',
                    background: 'var(--card)',
                    borderRadius: 6,
                    fontSize: 11,
                    color: 'var(--ink-2)',
                  }}
                >
                  {t('startButton')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
