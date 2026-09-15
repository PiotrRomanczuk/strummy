import { getTranslations } from 'next-intl/server';

import { Display, LandingContainer } from '@/components/landing/Landing.primitives';

import { ContactCta } from './ForSchools.ContactCta';
import { SCHOOL_ANCHORS, TIER_KEYS, TIER_POINTS, type TierKey } from './for-schools.data';

const Tier = async ({ tier }: { tier: TierKey }) => {
  const t = await getTranslations(`ForSchools.pricing.tiers.${tier}`);
  const pill = await getTranslations('ForSchools.pricing');
  const isPick = tier === 'school';

  return (
    <div className={`ui-sch-tier${isPick ? ' is-pick' : ''}`}>
      {isPick && (
        <span
          style={{
            display: 'inline-block',
            marginBottom: 10,
            padding: '3px 9px',
            borderRadius: 999,
            background: 'var(--gold-tint)',
            color: 'var(--gold-2)',
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: '.12em',
            textTransform: 'uppercase',
          }}
        >
          {pill('pill')}
        </span>
      )}
      <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500 }}>
        {t('name')}
      </h3>
      <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-3)', minHeight: '2.8em' }}>
        {t('who')}
      </p>
      <p
        style={{
          margin: '14px 0 2px',
          fontFamily: 'var(--serif)',
          fontSize: 34,
          lineHeight: 1,
          color: 'var(--ink)',
        }}
      >
        {t('amount')}
      </p>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-4)' }}>{t('per')}</p>
      <ul
        style={{
          margin: '16px 0 0',
          paddingLeft: 18,
          fontSize: 14,
          lineHeight: 1.7,
          color: 'var(--ink-2)',
        }}
      >
        {Array.from({ length: TIER_POINTS[tier] }, (_, i) => (
          <li key={i}>{t(`point${i}`)}</li>
        ))}
      </ul>
    </div>
  );
};

const Pilot = async () => {
  const t = await getTranslations('ForSchools.pricing.pilot');

  return (
    <div
      id={SCHOOL_ANCHORS.call}
      style={{
        marginTop: 32,
        padding: 28,
        border: '1px solid var(--rule)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--card)',
        scrollMarginTop: 80,
      }}
    >
      <h3 style={{ margin: '0 0 10px', fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500 }}>
        {t('title')}
      </h3>
      <p
        style={{
          margin: 0,
          maxWidth: '62ch',
          fontSize: 15,
          lineHeight: 1.65,
          color: 'var(--ink-2)',
        }}
      >
        {t('body')}
      </p>
      <div style={{ marginTop: 18 }}>
        <ContactCta kind="email">{t('cta')}</ContactCta>
      </div>
      <p style={{ margin: '14px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-4)' }}>
        {t('note')}
      </p>
    </div>
  );
};

/** Per school, never per student — and the pilot that opens the conversation. */
export const SchoolsPricing = async () => {
  const t = await getTranslations('ForSchools.pricing');

  return (
    <div
      id={SCHOOL_ANCHORS.pricing}
      style={{
        padding: '80px 0',
        background: 'var(--paper)',
        borderTop: '1px solid var(--rule)',
        scrollMarginTop: 80,
      }}
    >
      <LandingContainer>
        <div style={{ maxWidth: '60ch', marginBottom: 36 }}>
          <Display sizeClass="ui-land-display-44">{t('heading')}</Display>
          <p style={{ margin: '14px 0 0', fontSize: 16, lineHeight: 1.6, color: 'var(--ink-3)' }}>
            {t('lede')}
          </p>
        </div>

        <div className="ui-sch-tiers">
          {TIER_KEYS.map((tier) => (
            <Tier key={tier} tier={tier} />
          ))}
        </div>

        <Pilot />
      </LandingContainer>
    </div>
  );
};
