import { getTranslations } from 'next-intl/server';

import { Display, LandingContainer } from '@/components/landing/Landing.primitives';

import { FEATURE_KEYS, FEATURE_POINTS } from './for-schools.data';

/** The four jobs a school office repeats every week, one row each. */
export const SchoolsFeatures = async () => {
  const t = await getTranslations('ForSchools.features');

  return (
    <div style={{ padding: '80px 0' }}>
      <LandingContainer>
        <div style={{ maxWidth: '60ch', marginBottom: 32 }}>
          <Display sizeClass="ui-land-display-44">{t('heading')}</Display>
        </div>

        {FEATURE_KEYS.map((key) => (
          <div key={key} className="ui-sch-feature">
            <h3
              style={{
                margin: 0,
                fontFamily: 'var(--serif)',
                fontSize: 20,
                fontWeight: 500,
                lineHeight: 1.3,
              }}
            >
              {t(`${key}.title`)}
            </h3>
            <div>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--ink-2)' }}>
                {t(`${key}.body`)}
              </p>
              <ul
                style={{
                  margin: '10px 0 0',
                  paddingLeft: 18,
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: 'var(--ink-3)',
                }}
              >
                {Array.from({ length: FEATURE_POINTS }, (_, i) => (
                  <li key={i}>{t(`${key}.point${i}`)}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </LandingContainer>
    </div>
  );
};
