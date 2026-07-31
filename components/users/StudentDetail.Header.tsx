import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { SHOW_PRACTICE_FEATURES } from '@/lib/config/features';
import type { StudentPreferences, StudentProfile } from '@/lib/services/student-detail-queries';
import type { StudentHealth } from '@/lib/services/student-health.helpers';

import { HeaderIdentity } from './StudentDetail.Header.Identity';
import { Stat, formatMinutes, initialsFor } from './student-detail.shared';

type Props = {
  profile: StudentProfile;
  preferences: StudentPreferences | null;
  health: StudentHealth;
  stats: { active: number; mastered: number; totalMins: number };
};

export const StudentDetailHeader = async ({ profile, preferences, health, stats }: Props) => {
  const t = await getTranslations('Users');

  return (
    <div style={{ marginBottom: 22 }}>
      <Link href="/dashboard/users" className="ui-back-link">
        {t('createFormBackLink')}
      </Link>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 22,
          marginTop: 14,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: 92,
            height: 92,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--gold-tint), var(--gold-dim))',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--ink-2)',
            fontFamily: 'var(--serif)',
            fontSize: 36,
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          {initialsFor(profile.fullName, profile.email)}
        </div>

        <HeaderIdentity profile={profile} preferences={preferences} health={health} />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 32 }} className="ui-detail-stats">
          <Stat label={t('detailStatSongsInProgress')} value={String(stats.active)} />
          <Stat label={t('detailStatMastered')} value={String(stats.mastered)} />
          {SHOW_PRACTICE_FEATURES && (
            <Stat label={t('detailStatTotalPractice')} value={formatMinutes(stats.totalMins)} />
          )}
        </div>
      </div>
    </div>
  );
};
