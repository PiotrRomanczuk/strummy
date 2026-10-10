import Link from 'next/link';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Flame,
  GraduationCap,
  Mail,
  Music,
  Phone,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { avatarColorFor } from '@/components/shared/avatar-color.helpers';
import { SHOW_PRACTICE_FEATURES } from '@/lib/config/features';
import type { StudentPreferences, StudentProfile } from '@/lib/services/student-detail-queries';
import type { StudentHealth } from '@/lib/services/student-health.helpers';

import { HeaderActions } from './StudentDetail.Header.Actions';
import { StudentStatTiles, type StatTileData } from './StudentDetail.StatTiles';
import { ShadowBadge } from './ShadowBadge';
import { HealthBadge, formatDate, initialsFor } from './student-detail.shared';

export type StudentHeaderStats = {
  streak: number;
  daysSincePractice: number | null;
  attendance: number | null;
  attended: number;
  repertoire: number;
  lessonsCompleted: number;
};

type Props = {
  profile: StudentProfile;
  preferences: StudentPreferences | null;
  health: StudentHealth;
  stats: StudentHeaderStats;
};

const MetaItem = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    {icon}
    {children}
  </span>
);

/** Claude Design student header: breadcrumb, identity, actions, attention banner, stat tiles. */
export const StudentDetailHeader = async ({ profile, preferences, health, stats }: Props) => {
  const t = await getTranslations('Users');
  const name = profile.fullName ?? profile.email ?? t('detailStudentFallback');
  const isAtRisk = SHOW_PRACTICE_FEATURES && health.status === 'at_risk';
  const level = profile.skillLevel ?? preferences?.skillLevel ?? null;
  const since = profile.startDate ?? profile.createdAt;

  const tiles: StatTileData[] = [
    stats.streak > 0 || !isAtRisk
      ? {
          label: t('detailTileStreak'),
          value: String(stats.streak),
          unit: t('detailTileDays'),
          icon: <Flame size={16} strokeWidth={2} />,
          tone: 'gold',
        }
      : {
          label: t('detailTileLastPracticed'),
          value: stats.daysSincePractice == null ? '—' : String(stats.daysSincePractice),
          unit: t('detailTileDaysAgo'),
          icon: <Flame size={16} strokeWidth={2} />,
          tone: 'danger',
        },
    {
      label: t('detailTileAttendance'),
      value: stats.attendance == null ? '—' : `${stats.attendance}%`,
      unit: t('detailTileLastN', { count: stats.attended }),
      icon:
        stats.attendance != null && stats.attendance < 70 ? (
          <AlertTriangle size={16} strokeWidth={2} />
        ) : (
          <CheckCircle2 size={16} strokeWidth={2} />
        ),
      tone: stats.attendance != null && stats.attendance < 70 ? 'danger' : 'success',
    },
    {
      label: t('detailTileRepertoire'),
      value: String(stats.repertoire),
      unit: t('detailTileSongs'),
      icon: <Music size={16} strokeWidth={2} />,
      tone: 'neutral',
    },
    {
      label: t('detailTileLessons'),
      value: String(stats.lessonsCompleted),
      unit: t('detailTileCompleted'),
      icon: <GraduationCap size={16} strokeWidth={2} />,
      tone: 'neutral',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 24 }}>
      <nav
        aria-label="Breadcrumb"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: 'var(--ink-4)',
        }}
      >
        <Link href="/dashboard/users" style={{ color: 'inherit', textDecoration: 'none' }}>
          {t('detailBreadcrumbStudents')}
        </Link>
        <ChevronRight size={14} style={{ color: 'var(--ink-5)' }} aria-hidden="true" />
        <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{name}</span>
      </nav>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
        <div
          aria-hidden="true"
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            flexShrink: 0,
            background: avatarColorFor(name, profile.avatarColor),
            color: 'var(--on-accent)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--sans)',
            fontSize: 27,
            fontWeight: 600,
            boxShadow: '0 0 0 3px var(--card)',
          }}
        >
          {initialsFor(profile.fullName, profile.email)}
        </div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 34,
                fontWeight: 500,
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              {name}
            </h1>
            {SHOW_PRACTICE_FEATURES && <HealthBadge status={health.status} />}
            {profile.isShadow && <ShadowBadge />}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginTop: 8,
              color: 'var(--ink-3)',
              fontSize: 14,
              flexWrap: 'wrap',
            }}
          >
            {(profile.instrument || level) && (
              <MetaItem icon={<Music size={15} />}>
                <span style={{ textTransform: 'capitalize' }}>
                  {[profile.instrument, level].filter(Boolean).join(' · ')}
                </span>
              </MetaItem>
            )}
            {since && (
              <MetaItem icon={<Calendar size={15} />}>
                {t('detailSince', { date: formatDate(since) })}
              </MetaItem>
            )}
            {profile.email && <MetaItem icon={<Mail size={15} />}>{profile.email}</MetaItem>}
            {profile.phone && <MetaItem icon={<Phone size={15} />}>{profile.phone}</MetaItem>}
          </div>
        </div>
        <HeaderActions profile={profile} isAtRisk={isAtRisk} />
      </div>

      {isAtRisk && (
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
      )}

      <StudentStatTiles tiles={tiles} />
    </div>
  );
};
