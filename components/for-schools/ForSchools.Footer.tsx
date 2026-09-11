import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Wordmark } from '@/components/landing/Landing.primitives';

import { SCHOOL_ANCHORS, SCHOOL_CONTACT } from './for-schools.data';

const meta = { fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-4)' } as const;

export const SchoolsFooter = async () => {
  const t = await getTranslations('ForSchools.footer');

  return (
    <div
      style={{
        borderTop: '1px solid var(--rule)',
        background: 'var(--paper)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '12px 26px',
        padding: '30px 48px 44px',
      }}
    >
      <Wordmark fontSize={18} />
      <span style={meta}>{t('city')}</span>
      <a href={`mailto:${SCHOOL_CONTACT.email}`} className="ui-land-link">
        {SCHOOL_CONTACT.email}
      </a>
      <a href={`#${SCHOOL_ANCHORS.pricing}`} className="ui-land-link">
        {t('pricing')}
      </a>
      <Link href="/privacy" className="ui-land-link">
        {t('privacy')}
      </Link>
      <span style={{ ...meta, marginLeft: 'auto' }}>{t('copyright')}</span>
    </div>
  );
};
