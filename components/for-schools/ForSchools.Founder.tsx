import { getTranslations } from 'next-intl/server';

import { LandingContainer } from '@/components/landing/Landing.primitives';

import { FOUNDER_FACTS } from './for-schools.data';

/** Who is on the other end of the call, and the four facts a school asks about. */
export const SchoolsFounder = async () => {
  const t = await getTranslations('ForSchools.founder');

  return (
    <div style={{ padding: '80px 0', borderTop: '1px solid var(--rule)' }}>
      <LandingContainer>
        <div className="ui-land-founder-grid">
          <div>
            <blockquote
              style={{
                margin: 0,
                fontFamily: 'var(--serif)',
                fontSize: 22,
                lineHeight: 1.45,
                color: 'var(--ink)',
                textWrap: 'pretty',
              }}
            >
              {`„${t('quote')}”`}
            </blockquote>
            <p style={{ margin: '16px 0 0', fontSize: 14, color: 'var(--ink-4)' }}>
              {t('whoLine')}
            </p>
          </div>

          <dl style={{ margin: 0, borderTop: '1px solid var(--rule)' }}>
            {Array.from({ length: FOUNDER_FACTS }, (_, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(4.5rem, auto) minmax(0, 1fr)',
                  gap: 16,
                  padding: '13px 0',
                  borderBottom: '1px solid var(--rule)',
                }}
              >
                <dt
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 18,
                    fontWeight: 500,
                    color: 'var(--gold-2)',
                  }}
                >
                  {t(`fact${i}Label`)}
                </dt>
                <dd
                  style={{
                    margin: 0,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: 'var(--ink-2)',
                  }}
                >
                  {t(`fact${i}Body`)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </LandingContainer>
    </div>
  );
};
