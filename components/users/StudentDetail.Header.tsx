import Link from 'next/link';

import type { StudentPreferences, StudentProfile } from '@/lib/services/student-detail-queries';
import type { StudentHealth } from '@/lib/services/student-health.helpers';

import { GUITAR_LABELS } from '@/components/v2/onboarding/onboarding.constants';

import { DeleteShadowButton } from './DeleteShadowButton';
import { InviteShadowButton } from './InviteShadowButton';
import { ShadowBadge } from './ShadowBadge';
import { HealthBadge, Stat, formatDate, formatMinutes, initialsFor } from './StudentDetail.shared';

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

const healthDetail = (health: StudentHealth): string => {
  if (health.daysSincePractice === null) return 'No practice logged yet';
  if (health.status === 'on_track') return `Practiced ${health.daysSincePractice}d ago`;
  return `${health.daysSincePractice} days since practice`;
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
}: {
  profile: StudentProfile;
  needsReachOut: boolean;
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
        {needsReachOut ? 'Reach out' : 'Message'}
      </a>
    )}
    {/* Carry the student through so the teacher isn't asked to re-pick the
        person whose page they're already on (LES-5). */}
    <Link
      href={`/dashboard/lessons/new?studentId=${encodeURIComponent(profile.id)}`}
      style={actionStyle}
    >
      Schedule lesson
    </Link>
    {profile.isShadow && (
      <InviteShadowButton userId={profile.id} defaultEmail={profile.inviteEmail} />
    )}
    <Link href={`/dashboard/users/${profile.id}/import`} style={actionStyle}>
      Import songs
    </Link>
    {profile.isShadow && <DeleteShadowButton userId={profile.id} />}
  </div>
);

type Props = {
  profile: StudentProfile;
  preferences: StudentPreferences | null;
  health: StudentHealth;
  stats: { active: number; mastered: number; totalMins: number };
};

export const StudentDetailHeader = ({ profile, preferences, health, stats }: Props) => {
  const display = profile.fullName ?? profile.email ?? 'Student';
  const needsReachOut = health.status !== 'on_track';

  return (
    <div style={{ marginBottom: 22 }}>
      <Link href="/dashboard/users" className="ui-back-link">
        ← Students
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
            Student · joined {formatDate(profile.createdAt)}
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
            <HealthBadge status={health.status} />
            {profile.isShadow && <ShadowBadge />}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {profile.email && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-3)' }}>
                {profile.email}
              </span>
            )}
            <span
              className="ui-health-detail"
              data-status={health.status}
              style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}
            >
              · {healthDetail(health)}
            </span>
          </div>

          {preferences && <PreferencesLine preferences={preferences} />}
          <HeaderActions profile={profile} needsReachOut={needsReachOut} />
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 32 }} className="ui-detail-stats">
          <Stat label="Songs in progress" value={String(stats.active)} />
          <Stat label="Mastered" value={String(stats.mastered)} />
          <Stat label="Total practice" value={formatMinutes(stats.totalMins)} />
        </div>
      </div>
    </div>
  );
};
