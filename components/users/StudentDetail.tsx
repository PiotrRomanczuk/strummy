import type {
  StudentPreferences,
  StudentProfile,
  StudentRecentLesson,
  StudentRepertoireRow,
} from '@/lib/services/student-detail-queries';
import type { PracticeDay } from '@/lib/services/student-health.helpers';
import { computeHealth, latestPracticedAt } from '@/lib/services/student-health.helpers';
import type { NextLesson, PracticeSessionRow } from '@/lib/services/student-health-queries';
import type { Skill, StudentSkill } from '@/app/actions/student-skills';

import { SHOW_PRACTICE_FEATURES } from '@/lib/config/features';

import { StudentDetailBody } from './StudentDetail.Body';
import { StudentDetailHeader } from './StudentDetail.Header';
import { attendancePct, practiceStreak } from './student-detail-stats.helpers';

export { Empty, formatMinutes } from './student-detail.shared';

type Props = {
  profile: StudentProfile;
  repertoire: StudentRepertoireRow[];
  lessons: StudentRecentLesson[];
  preferences: StudentPreferences | null; // IDA-4 — null when onboarding was never completed
  practiceHistory: PracticeDay[];
  practiceSessions: PracticeSessionRow[];
  nextLesson: NextLesson;
  /** True when the viewer is staff (admin/teacher) and may edit repertoire status. */
  canEdit?: boolean;
  /** All-time completed lessons — the fourth stat tile. */
  lessonsCompleted?: number;
  studentSkills?: StudentSkill[];
  availableSkills?: Skill[];
};

export const StudentDetail = ({
  profile,
  repertoire,
  lessons,
  preferences,
  practiceHistory,
  practiceSessions,
  nextLesson,
  canEdit = false,
  lessonsCompleted = 0,
  studentSkills = [],
  availableSkills = [],
}: Props) => {
  const now = new Date();
  const health = computeHealth(latestPracticedAt(repertoire), now);
  const past = lessons.filter((l) => Date.parse(l.scheduledAt) < now.getTime());

  return (
    <div
      style={{
        background: 'var(--ivory)',
        color: 'var(--ink)',
        fontSize: 13,
        lineHeight: 1.4,
        minHeight: '100%',
        padding: '28px 32px 64px',
        maxWidth: '100%',
      }}
    >
      <StudentDetailHeader
        profile={profile}
        preferences={preferences}
        health={health}
        stats={{
          streak: practiceStreak(practiceHistory, now),
          daysSincePractice: health.daysSincePractice,
          attendance: attendancePct(lessons, now),
          attended: past.length,
          repertoire: repertoire.length,
          lessonsCompleted: lessonsCompleted,
        }}
      />
      <StudentDetailBody
        repertoire={repertoire}
        lessons={lessons}
        practiceHistory={practiceHistory}
        practiceSessions={practiceSessions}
        now={now.getTime()}
        nextLesson={nextLesson}
        canEdit={canEdit}
        studentId={profile.id}
        studentSkills={studentSkills}
        availableSkills={availableSkills}
        isAtRisk={SHOW_PRACTICE_FEATURES && health.status === 'at_risk'}
      />
    </div>
  );
};
