import { AlertTriangle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { GUITAR_LABELS } from '@/components/onboarding/onboarding.constants';
import type { StudentPreferences, StudentProfile } from '@/lib/services/student-detail-queries';
import type { StudentHealth } from '@/lib/services/student-health.helpers';

const goalChip = {
  fontFamily: 'var(--sans)',
  fontSize: 11,
  color: 'var(--ink-3)',
  background: 'var(--paper)',
  border: '1px solid var(--rule)',
  borderRadius: 12,
  padding: '2px 10px',
} as const;

/**
 * What the student told onboarding: the guitars they own and their goals. The
 * level already sits in the header's meta line. Keys render as prose
 * (GUITAR_LABELS); an unrecognised key renders verbatim rather than vanishing.
 */
export const StudentAboutLine = ({ preferences }: { preferences: StudentPreferences | null }) => {
  if (!preferences || (preferences.guitars.length === 0 && preferences.goals.length === 0)) {
    return null;
  }
  return (
    <div
      data-testid="student-about-line"
      style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
    >
      {preferences.guitars.map((guitar) => (
        <span key={guitar} className="ui-chip" data-testid="student-guitar-chip">
          {GUITAR_LABELS[guitar] ?? guitar}
        </span>
      ))}
      {preferences.goals.map((goal) => (
        <span key={goal} style={goalChip}>
          {goal}
        </span>
      ))}
    </div>
  );
};

type BannerProps = { profile: StudentProfile; health: StudentHealth };

/** Red "Needs attention" strip with a mailto Reach out, shown for at-risk students. */
export const StudentAttentionBanner = async ({ profile, health }: BannerProps) => {
  const t = await getTranslations('Users');
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'color-mix(in srgb, var(--danger) 10%, var(--card))',
        border: '1px solid color-mix(in srgb, var(--danger) 25%, var(--card))',
        borderRadius: 12,
        padding: '14px 18px',
      }}
    >
      <AlertTriangle
        size={20}
        strokeWidth={2}
        style={{ color: 'var(--danger)' }}
        aria-hidden="true"
      />
      <div style={{ flex: 1, fontSize: 14 }}>
        <span style={{ fontWeight: 600, color: 'var(--danger)' }}>
          {t('detailNeedsAttention')} ·{' '}
        </span>
        <span style={{ color: 'var(--ink-2)' }}>
          {health.daysSincePractice == null
            ? t('detailHealthNeverPracticed')
            : t('detailBannerNoPractice', { days: health.daysSincePractice })}
        </span>
      </div>
      {profile.email && (
        <a
          href={`mailto:${profile.email}`}
          style={{
            padding: '7px 12px',
            fontSize: 14,
            fontWeight: 500,
            borderRadius: 8,
            background: 'var(--danger)',
            color: 'var(--on-accent)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {t('detailReachOutLabel')}
        </a>
      )}
    </div>
  );
};
