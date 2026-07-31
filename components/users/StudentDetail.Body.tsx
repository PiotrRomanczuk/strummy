'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

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

import { LessonsCard } from './StudentDetail.Lessons';
import { NextLessonCard } from './StudentDetail.NextLesson';
import { TeacherNoteCard } from './StudentDetail.Note';
import { PracticeChart } from './StudentDetail.PracticeChart';
import { PracticeLogCard } from './StudentDetail.PracticeLog';
import { StudentDetailRepertoire } from './StudentDetail.Repertoire';
import { Card, CardHeader } from './student-detail.shared';

const TAB_DEFS = [
  { key: 'overview', labelKey: 'detailTabOverview' },
  { key: 'lessons', labelKey: 'detailTabLessons' },
  { key: 'repertoire', labelKey: 'detailTabRepertoire' },
  { key: 'practice', labelKey: 'detailTabPractice' },
] as const;

type TabKey = (typeof TAB_DEFS)[number]['key'];

type Props = {
  repertoire: StudentRepertoireRow[];
  lessons: StudentRecentLesson[];
  practiceHistory: PracticeDay[];
  practiceSessions: PracticeSessionRow[];
  nextLesson: NextLesson;
  latestNote: LatestNote;
  goalMin: number;
  canEdit: boolean;
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
}: Props) => {
  const [tab, setTab] = useState<TabKey>('overview');
  const t = useTranslations('Users');
  const tSongs = useTranslations('Songs');

  return (
    <div>
      <div className="ui-tabs" role="tablist" aria-label={t('detailTabsAriaLabel')}>
        {TAB_DEFS.map((td) => (
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
            <PracticeChart days={practiceHistory} goalMin={goalMin} />
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

      {tab === 'practice' && <PracticeLogCard sessions={practiceSessions} />}
    </div>
  );
};
