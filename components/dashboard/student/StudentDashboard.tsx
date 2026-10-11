import { StudentActivityCard } from './StudentDashboard.Activity';
import { StudentCountdown } from './StudentDashboard.Countdown';
import { StudentLastLessonCard } from './StudentDashboard.LastLesson';
import { StudentMobileTop } from './StudentDashboard.Mobile';
import { DashboardMobileHeader } from '../DashboardMobileHeader';
import { greetingName } from '../greeting.helpers';
import { StudentPracticeSet } from './StudentDashboard.PracticeSet';
import { StudentAchievementsCard, StudentStreakCard } from './StudentDashboard.Progress';
import { StudentRepertoireCard } from './StudentDashboard.Repertoire';
import { StudentSongOfWeekCard } from './StudentDashboard.SongOfWeek';
import type { StudentHomeData } from './student-home.data';
import { StringWaves } from '../DashboardPrimitives';

type Props = { home: StudentHomeData; now: Date; fullName: string | null; email: string };

/**
 * Claude Design student dashboard — "what do I practice today?". Desktop: a
 * two-pane hero (countdown · today's set list) over recap and repertoire on the
 * left, streak, activity and achievements on the right. Phones get the mobile
 * mockup's compact top (countdown, set list, stat strip, recap) instead of the
 * hero, recap card and streak card; the rest is shared.
 */
export const StudentDashboard = ({ home, now, fullName, email }: Props) => (
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
    {/* The design has no visible page title; keep one for the document outline. */}
    <h1 className="sr-only">{greetingName(fullName, email)} · Dashboard</h1>
    <DashboardMobileHeader fullName={fullName} email={email} now={now} />
    <div className="md:hidden">
      <StudentMobileTop home={home} now={now} />
    </div>
    <div className="hidden md:block">
      <div className="ui-student-hero">
        <StringWaves />
        <StudentCountdown lesson={home.nextLesson} week={home.week} now={now} />
        <StudentPracticeSet
          items={home.practiceSet}
          minutesToday={home.minutesToday}
          lesson={home.nextLesson}
        />
      </div>
    </div>

    <div className="ui-student-secondary">
      <div className="ui-student-col">
        <div className="hidden md:block">
          <StudentLastLessonCard lesson={home.lastLesson} homework={home.homework} />
        </div>
        <StudentRepertoireCard songs={home.repertoire} agoBySong={home.agoBySong} />
      </div>
      <div className="ui-student-col">
        <div className="hidden md:block">
          <StudentStreakCard streak={home.streak} />
        </div>
        <StudentActivityCard items={home.activity} now={now} />
        <StudentAchievementsCard {...home.achievements} />
        <StudentSongOfWeekCard />
      </div>
    </div>
  </div>
);
