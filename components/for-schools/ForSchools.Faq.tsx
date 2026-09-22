import { getTranslations } from 'next-intl/server';

import { Display, LandingContainer } from '@/components/landing/Landing.primitives';

import { FAQ_COUNT } from './for-schools.data';

/** Native <details> — the answers stay in the DOM, so they are findable and crawlable. */
export const SchoolsFaq = async () => {
  const t = await getTranslations('ForSchools.faq');

  return (
    <div className="ui-sch-faq" style={{ padding: '80px 0', background: 'var(--paper)' }}>
      <LandingContainer>
        <div style={{ maxWidth: '60ch', marginBottom: 28 }}>
          <Display sizeClass="ui-land-display-44">{t('heading')}</Display>
        </div>

        {Array.from({ length: FAQ_COUNT }, (_, i) => (
          <details
            key={i}
            style={{
              padding: '16px 0',
              borderTop: '1px solid var(--rule)',
              borderBottom: i === FAQ_COUNT - 1 ? '1px solid var(--rule)' : 'none',
            }}
          >
            <summary>{t(`q${i}`)}</summary>
            <p
              style={{
                margin: '12px 0 0',
                maxWidth: '66ch',
                fontSize: 15,
                lineHeight: 1.65,
                color: 'var(--ink-3)',
              }}
            >
              {t(`a${i}`)}
            </p>
          </details>
        ))}
      </LandingContainer>
    </div>
  );
};
