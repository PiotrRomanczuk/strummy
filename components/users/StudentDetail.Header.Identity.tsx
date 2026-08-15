import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { SHOW_PRACTICE_FEATURES } from '@/lib/config/features';
import type { StudentPreferences, StudentProfile } from '@/lib/services/student-detail-queries';
import type { StudentHealth } from '@/lib/services/student-health.helpers';

import { GUITAR_LABELS } from '@/components/onboarding/onboarding.constants';

import { DeleteShadowButton } from './DeleteShadowButton';
import { InlineInviteButton } from './InlineInviteButton';
import { InviteShadowButton } from './InviteShadowButton';
import { ShadowBadge } from './ShadowBadge';
import { HealthBadge, formatDate } from './student-detail.shared';

type Translator = Awaited<ReturnType<typeof getTranslations>>;

const actionStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 8,
  border: '1px solid var(--rule)',
  background: 'transparent',
  color: 'var(--ink)',
  fontSize: 12,
  fontWeight: 500,
  fontFamily: 'var(--sans)',
  textDecoration: 'none',
};

const dayUnitLabel = (days: number, t: Translator): string =>
  days === 1 ? t('detailHealthDaySingular') : t('detailHealthDayPlural');

const healthDetail = (health: StudentHealth, t: Translator): string => {
  if (health.daysSincePractice === null) return t('detailHealthNeverPracticed');
  const unit = dayUnitLabel(health.daysSincePractice, t);
  if (health.status === 'on_track') {
    return t('detailHealthPracticedDaysAgo', { days: health.daysSincePractice, unit });
  }
  return t('detailHealthDaysSincePractice', { days: health.daysSincePractice, unit });
};

const PreferencesLine = ({ preferences }: { preferences: StudentPreferences }) => (
  <div
    data-testid="student-about-line"
    style={{
      marginTop: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
      fontSize: 12,
    }}
  >
    {/* skillLevel may be empty for intake-only students (profiles.skill_level
        is the single source since 2026-07-27) — render the chip only when set. */}
    {preferences.skillLevel && <span className="ui-chip">{preferences.skillLevel}</span>}
    {/* What they actually play — the answer a teacher wants before lesson one
        ("no guitar yet" changes the whole plan). Keys come from onboarding;
        an unrecognised one renders as-is rather than disappearing. */}
    {preferences.guitars.map((guitar) => (
      <span key={guitar} className="ui-chip" data-testid="student-guitar-chip">
        {GUITAR_LABELS[guitar] ?? guitar}
      </span>
    ))}
    {preferences.goals.map((goal) => (
      <span
        key={goal}
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 11,
          color: 'var(--ink-3)',
          background: 'var(--paper)',
          borderRadius: 12,
          padding: '2px 10px',
        }}
      >
        {goal}
      </span>
    ))}
  </div>
);

const HeaderActions = ({
  profile,
  needsReachOut,
  t,
}: {
  profile: StudentProfile;
  needsReachOut: boolean;
  t: Translator;
}) => (
  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
    {profile.email && (
      <a
        href={`mailto:${profile.email}`}
        style={{
          ...actionStyle,
          border: 'none',
          background: needsReachOut ? 'var(--warn)' : 'var(--ink)',
          color: 'var(--ivory)',
        }}
      >
        {needsReachOut ? t('detailReachOutLabel') : t('detailMessageLabel')}
      </a>
    )}
    {/* Carry the student through so the teacher isn't asked to re-pick the
        person whose page they're already on (LES-5). */}
    <Link
      href={`/dashboard/lessons/new?studentId=${encodeURIComponent(profile.id)}`}
      style={actionStyle}
    >
      {t('detailScheduleLessonLink')}
    </Link>
    {profile.isShadow ? (
      <InviteShadowButton userId={profile.id} defaultEmail={profile.inviteEmail} />
    ) : (
      // Already invited but never signed in: the address is on the row, so this
      // just re-sends. Invite links expire, and without this a student who
      // missed the window had no route back in.
      !profile.hasSignedIn &&
      profile.email && (
        <InlineInviteButton userId={profile.id} inviteEmail={profile.email} isResend />
      )
    )}
    <Link href={`/dashboard/users/${profile.id}/import`} style={actionStyle}>
      {t('detailImportSongsLink')}
    </Link>
    {profile.isShadow && <DeleteShadowButton userId={profile.id} />}
  </div>
);

type Props = {
  profile: StudentProfile;
  preferences: StudentPreferences | null;
  health: StudentHealth;
};

/**
 * Name/badges/health-detail/preferences/actions block of the student-detail
 * header. Split out of StudentDetail.Header.tsx to keep both files under the
 * component size limits (mirrors the RecordingQualityForm → StatusSelect split).
 */
export const HeaderIdentity = async ({ profile, preferences, health }: Props) => {
  const t = await getTranslations('Users');
  const tRoles = await getTranslations('Roles');
  const display = profile.fullName ?? profile.email ?? tRoles('student');
  // "Reach out" is purely a days-since-practice verdict, so it goes dark with
  // the rest of practice — otherwise the button nags about a signal the teacher
  // can no longer see anywhere in the UI.
  const needsReachOut = SHOW_PRACTICE_FEATURES && health.status !== 'on_track';

  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '.16em',
        }}
      >
        {t('detailJoinedLabel', { date: formatDate(profile.createdAt) })}
      </div>
      <h1
        style={{
          margin: '4px 0',
          fontFamily: 'var(--serif)',
          fontWeight: 400,
          fontSize: 44,
          letterSpacing: '-0.02em',
          fontStyle: 'italic',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        {display}
        {SHOW_PRACTICE_FEATURES && <HealthBadge status={health.status} />}
        {profile.isShadow && <ShadowBadge />}
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {profile.email && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-3)' }}>
            {profile.email}
          </span>
        )}
        {SHOW_PRACTICE_FEATURES && (
          <span
            className="ui-health-detail"
            data-status={health.status}
            style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}
          >
            · {healthDetail(health, t)}
          </span>
        )}
      </div>

      {preferences && <PreferencesLine preferences={preferences} />}
      <HeaderActions profile={profile} needsReachOut={needsReachOut} t={t} />
    </div>
  );
};
