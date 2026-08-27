'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { SAMPLE_STUDENTS } from './landing.data';
import { ArrowRight, CtaLink, PlayGlyph, SampleAvatar } from './Landing.primitives';

type HeroRole = 'teacher' | 'student';

const ROLES: HeroRole[] = ['teacher', 'student'];

const HeroRoleToggle = ({
  role,
  onChange,
}: {
  role: HeroRole;
  onChange: (role: HeroRole) => void;
}) => {
  const t = useTranslations('Landing.hero');

  return (
    <div
      role="tablist"
      aria-label={t('toggleTeacher') + ' / ' + t('toggleStudent')}
      style={{
        display: 'inline-flex',
        gap: 2,
        padding: 3,
        border: '1px solid var(--rule)',
        borderRadius: 999,
        background: 'var(--card)',
        marginBottom: 28,
      }}
    >
      {ROLES.map((r) => (
        <button
          key={r}
          type="button"
          role="tab"
          aria-selected={role === r}
          onClick={() => onChange(r)}
          style={{
            padding: '7px 16px',
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: 'var(--sans)',
            fontWeight: 500,
            background: role === r ? 'var(--ink)' : 'transparent',
            color: role === r ? 'var(--ivory)' : 'var(--ink-3)',
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
        >
          {t(r === 'teacher' ? 'toggleTeacher' : 'toggleStudent')}
        </button>
      ))}
    </div>
  );
};

const HeroBadge = ({ role }: { role: HeroRole }) => {
  const t = useTranslations('Landing.hero');

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '4px 12px 4px 4px',
        border: '1px solid var(--rule)',
        borderRadius: 999,
        background: 'var(--card)',
        marginBottom: 36,
        marginLeft: 12,
      }}
    >
      <span
        style={{
          padding: '2px 10px',
          borderRadius: 999,
          background: 'var(--gold-tint)',
          color: 'var(--gold-2)',
          fontFamily: 'var(--mono)',
          fontSize: 10,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
        }}
      >
        {t('badge')}
      </span>
      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{t(`${role}.badgeSub`)}</span>
    </div>
  );
};

const HeroSocialProof = ({ role }: { role: HeroRole }) => {
  const t = useTranslations('Landing.hero');

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        color: 'var(--ink-4)',
        fontSize: 12.5,
      }}
    >
      <div style={{ display: 'flex' }}>
        {SAMPLE_STUDENTS.slice(0, 4).map((s, i) => (
          <span
            key={s.avatar}
            style={{
              display: 'inline-flex',
              borderRadius: '50%',
              border: '2px solid var(--ivory)',
              marginLeft: i === 0 ? 0 : -8,
            }}
          >
            <SampleAvatar s={s} size={26} />
          </span>
        ))}
      </div>
      <span>
        {t(`${role}.builtByPrefix`)}
        <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{t(`${role}.builtBySuffix`)}</span>
      </span>
    </div>
  );
};

/** Hero text + role toggle (teacher / student). Client-only: the two copy sets swap on click. */
export const HeroCopy = () => {
  const t = useTranslations('Landing.hero');
  const [role, setRole] = useState<HeroRole>('teacher');

  return (
    <div>
      <HeroRoleToggle role={role} onChange={setRole} />

      <HeroBadge role={role} />

      <h1
        className="ui-land-h1"
        style={{
          margin: '0 0 32px',
          fontFamily: 'var(--serif)',
          fontWeight: 400,
          lineHeight: 1.04,
          letterSpacing: '-0.028em',
          color: 'var(--ink)',
          textWrap: 'balance',
        }}
      >
        {t(`${role}.headlinePrefix`)}
        <em style={{ fontStyle: 'italic', color: 'var(--gold-2)' }}>
          {t(`${role}.headlineEmphasis`)}
        </em>
        {t(`${role}.headlineSuffix`)}
      </h1>

      <div
        style={{
          fontSize: 18,
          lineHeight: 1.6,
          color: 'var(--ink-3)',
          maxWidth: 480,
          marginBottom: 40,
          textWrap: 'pretty',
        }}
      >
        {t(`${role}.subheadline`)}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 32,
          flexWrap: 'wrap',
        }}
      >
        <CtaLink href="/sign-in?demo=true" size="lg">
          {t('startFree')}
          <ArrowRight />
        </CtaLink>
        <CtaLink href="/for-teachers" variant="ghost" size="lg">
          <PlayGlyph />
          {t('seeHowItWorks')}
        </CtaLink>
      </div>

      <HeroSocialProof role={role} />
    </div>
  );
};
