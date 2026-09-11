import { getTranslations } from 'next-intl/server';

import { Display, LandingContainer } from '@/components/landing/Landing.primitives';

import { ContactCta } from './ForSchools.ContactCta';

/** Closing ask — the same two ways to reach a person as the pilot box. */
export const SchoolsFinalCta = async () => {
  const t = await getTranslations('ForSchools.final');

  return (
    <div style={{ padding: '80px 0', borderTop: '1px solid var(--rule)' }}>
      <LandingContainer>
        <Display sizeClass="ui-land-display-48">{t('heading')}</Display>
        <p
          style={{
            margin: '16px 0 0',
            maxWidth: '58ch',
            fontSize: 16,
            lineHeight: 1.6,
            color: 'var(--ink-3)',
          }}
        >
          {t('lede')}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 26 }}>
          <ContactCta kind="email">{t('ctaEmail')}</ContactCta>
          <ContactCta kind="phone" variant="ghost">
            {t('ctaPhone')}
          </ContactCta>
        </div>
      </LandingContainer>
    </div>
  );
};
