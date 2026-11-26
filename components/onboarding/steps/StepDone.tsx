'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { OnboardingRole } from '@/types/onboarding';
import { OnbHeader } from '../onboarding.shared';

type Props = {
  role: OnboardingRole | null;
  firstName?: string;
};

export const StepDone = ({ role, firstName }: Props) => {
  const t = useTranslations('Onboarding');
  const name = firstName?.trim();
  const title = name ? t('done.title', { name }) : t('done.titleNoName');
  const copy = t(role === 'teacher' ? 'done.copyTeacher' : 'done.copyStudent');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <OnbHeader eyebrow={t('done.eyebrow')} title={title} sub={copy} />

      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--gold-tint)',
          border: '1.5px solid var(--gold-2)',
          color: 'var(--gold-2)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 24,
          marginBottom: 24,
        }}
      >
        ✓
      </div>

      <Link
        href="/dashboard"
        className="ui-onb-primary"
        style={{
          alignSelf: 'flex-start',
          padding: '12px 24px',
          borderRadius: 8,
          background: 'var(--ink)',
          color: 'var(--paper)',
          fontSize: 14,
          fontWeight: 500,
          textDecoration: 'none',
          fontFamily: 'var(--sans)',
        }}
      >
        {t('done.cta')} →
      </Link>
    </div>
  );
};
