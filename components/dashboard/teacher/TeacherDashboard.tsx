import type {
  AtRiskStudent,
  OverdueAssignmentRow,
  Utilization,
  WeekDensityDay,
} from '@/lib/services/teacher-dashboard-backfill-queries';
import type {
  LibrarySong,
  StudioStudent,
  WeekComparison,
} from '@/lib/services/teacher-dashboard-studio-queries';
import { SHOW_PRACTICE_FEATURES } from '@/lib/config/features';
import type { DayLesson, TeacherDayStats } from '@/lib/services/teacher-dashboard-queries';

import { DashboardMobileHeader } from '../DashboardMobileHeader';
import { buildAttentionFlags } from './teacher-attention.helpers';
import { TeacherDaySpine } from './TeacherDaySpine';
import { TeacherGreeting } from './TeacherGreeting';
import { SongLibraryCard } from './TeacherDashboard.Library';
import { TeacherMobileTop } from './TeacherDashboard.Mobile';
import { NeedsAttentionCard } from './TeacherDashboard.NeedsAttention';
import { StudioRosterCard } from './TeacherDashboard.Roster';
import { WeekCompareCard } from './TeacherDashboard.WeekCompare';
import { WeekDensityCard } from './TeacherDashboard.WeekDensity';

type Props = {
  fullName: string | null;
  email: string;
  now: Date;
  lessons: DayLesson[];
  stats: TeacherDayStats;
  atRisk: AtRiskStudent[];
  overdueAssignments?: OverdueAssignmentRow[];
  weekDensity: WeekDensityDay[];
  utilization: Utilization;
  roster: { total: number; rows: StudioStudent[] };
  compare: WeekComparison;
  library: { total: number; songs: LibrarySong[] };
};

const firstName = (name: string | null, email: string | null): string =>
  (name ?? email ?? '').trim().split(/\s+/)[0];

/** Claude Design teacher dashboard: greeting · day spine + side column · roster + library. */
export const TeacherDashboard = ({
  fullName,
  email,
  now,
  lessons,
  stats,
  atRisk,
  overdueAssignments = [],
  weekDensity,
  utilization,
  roster,
  compare,
  library,
}: Props) => {
  // "At risk" is days-since-practice only, so it goes dark with practice.
  const practiceFlags = SHOW_PRACTICE_FEATURES ? atRisk : [];
  const top = practiceFlags[0];
  const insight = top
    ? {
        name: firstName(top.name, top.email),
        text:
          top.daysSincePractice == null
            ? 'hasn’t logged any practice yet. Consider an easy warm-up at the next lesson.'
            : `hasn’t practiced in ${top.daysSincePractice} days. Consider an easier warm-up next session.`,
      }
    : null;
  const dayLessons = lessons.map((l) => ({
    ...l,
    isAtRisk: practiceFlags.some((r) => r.studentId === l.studentId),
  }));

  return (
    <div
      className="ui-dash-page"
      style={{
        background: 'var(--ivory)',
        color: 'var(--ink)',
        fontSize: 13,
        lineHeight: 1.4,
        minHeight: '100%',
      }}
    >
      <DashboardMobileHeader
        fullName={fullName}
        email={email}
        now={now}
        avatarColor="var(--ink-2)"
      />
      <div className="md:hidden">
        <TeacherMobileTop
          lessons={dayLessons}
          flags={buildAttentionFlags(practiceFlags, overdueAssignments, now, 3)}
          now={now}
        />
      </div>
      <div className="hidden md:block">
        <TeacherGreeting
          fullName={fullName}
          email={email}
          now={now}
          stats={stats}
          insight={insight}
        />
      </div>
      <div className="ui-grid-hero">
        <div className="hidden min-w-0 md:block">
          <TeacherDaySpine lessons={dayLessons} now={now} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <div className="hidden md:block">
            <NeedsAttentionCard atRisk={practiceFlags} overdue={overdueAssignments} now={now} />
          </div>
          <WeekDensityCard
            days={weekDensity}
            now={now}
            teachingHours={compare.teachingHours.curr}
            utilizationPct={utilization.pct}
          />
          <WeekCompareCard data={compare} />
        </div>
      </div>
      <div className="ui-grid-2" style={{ marginTop: 20 }}>
        <StudioRosterCard total={roster.total} rows={roster.rows} now={now} />
        <SongLibraryCard total={library.total} songs={library.songs} />
      </div>
    </div>
  );
};
