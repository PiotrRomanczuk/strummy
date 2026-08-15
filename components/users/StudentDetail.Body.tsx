'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { SHOW_PRACTICE_FEATURES } from '@/lib/config/features';
import type { PracticeDay } from '@/lib/services/student-health.helpers';
import type {
  StudentRecentLesson,
  StudentRepertoireRow,
} from '@/lib/services/student-detail-queries';
import type {
  LatestNote,
  NextLesson,
  PracticeSessionRow,
} from '@/lib/services/student-health-queries';
import type { Skill, StudentSkill } from '@/app/actions/student-skills';

import { LessonsCard } from './StudentDetail.Lessons';
import { NextLessonCard } from './StudentDetail.NextLesson';
import { TeacherNoteCard } from './StudentDetail.Note';
import { PracticeChart } from './StudentDetail.PracticeChart';
import { PracticeLogCard } from './StudentDetail.PracticeLog';
import { StudentDetailRepertoire } from './StudentDetail.Repertoire';
import { StudentDetailSkills } from './StudentDetail.Skills';
import { Card, CardHeader } from './student-detail.shared';

const ALL_TAB_DEFS = [
  { key: 'overview', labelKey: 'detailTabOverview' },
  { key: 'lessons', labelKey: 'detailTabLessons' },
  { key: 'repertoire', labelKey: 'detailTabRepertoire' },
  { key: 'skills', labelKey: 'detailTabSkills' },
  { key: 'practice', labelKey: 'detailTabPractice' },
] as const;

type TabKey = (typeof ALL_TAB_DEFS)[number]['key'];

/**
 * Read at render, not at module load: a module-level constant would freeze the
 * flag at import time, which makes the tab list untestable in both states and
 * would silently ignore a flag flip under any kind of module reuse.
 */
const visibleTabs = (): readonly { key: TabKey; labelKey: string }[] =>
  SHOW_PRACTICE_FEATURES ? ALL_TAB_DEFS : ALL_TAB_DEFS.filter((td) => td.key !== 'practice');

type Props = {
  repertoire: StudentRepertoireRow[];
  lessons: StudentRecentLesson[];
  practiceHistory: PracticeDay[];
  practiceSessions: PracticeSessionRow[];
  nextLesson: NextLesson;
  latestNote: LatestNote;
  goalMin: number;
  canEdit: boolean;
  studentId: string;
  studentSkills: StudentSkill[];
  availableSkills: Skill[];
};

/**
 * Tabbed body of the student-detail view. The only client-stateful piece —
 * everything it renders is presentational and receives server-computed props,
 * so no server-only module reaches the client bundle.
 */
export const StudentDetailBody = ({
  repertoire,
  lessons,
  practiceHistory,
  practiceSessions,
  nextLesson,
  latestNote,
  goalMin,
  canEdit,
  studentId,
  studentSkills,
  availableSkills,
}: Props) => {
  const [tab, setTab] = useState<TabKey>('overview');
  const t = useTranslations('Users');
  const tSongs = useTranslations('Songs');
  const tabDefs = visibleTabs();

  return (
    <div>
      <div className="ui-tabs" role="tablist" aria-label={t('detailTabsAriaLabel')}>
        {tabDefs.map((td) => (
          <button
            key={td.key}
            type="button"
            role="tab"
            aria-selected={tab === td.key}
            className={`ui-tab${tab === td.key ? ' is-active' : ''}`}
            onClick={() => setTab(td.key)}
          >
            {t(td.labelKey)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="ui-detail-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {SHOW_PRACTICE_FEATURES && <PracticeChart days={practiceHistory} goalMin={goalMin} />}
            <LessonsCard lessons={lessons.slice(0, 4)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <NextLessonCard lesson={nextLesson} />
            <TeacherNoteCard note={latestNote} />
          </div>
        </div>
      )}

      {tab === 'lessons' && <LessonsCard lessons={lessons} />}

      {tab === 'repertoire' && (
        <Card>
          <CardHeader
            eyebrow={t('detailRepertoireEyebrow')}
            title={t('detailRepertoireTitle')}
            meta={
              repertoire.length > 0
                ? `${repertoire.length} ${
                    repertoire.length === 1
                      ? tSongs('songCountSingular')
                      : tSongs('songCountPlural')
                  }`
                : undefined
            }
          />
          <StudentDetailRepertoire repertoire={repertoire} canEdit={canEdit} />
        </Card>
      )}

      {tab === 'skills' && (
        <StudentDetailSkills
          studentId={studentId}
          studentSkills={studentSkills}
          availableSkills={availableSkills}
          canEdit={canEdit}
        />
      )}

      {SHOW_PRACTICE_FEATURES && tab === 'practice' && (
        <PracticeLogCard sessions={practiceSessions} />
      )}
    </div>
  );
};
