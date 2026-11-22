'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { SHOW_PRACTICE_FEATURES } from '@/lib/config/features';
import type { PracticeDay } from '@/lib/services/student-health.helpers';
import type {
  StudentRecentLesson,
  StudentRepertoireRow,
} from '@/lib/services/student-detail-queries';
import type { NextLesson, PracticeSessionRow } from '@/lib/services/student-health-queries';
import type { Skill, StudentSkill } from '@/app/actions/student-skills';
import type { StudentFeature } from '@/lib/config/student-features';
import type { StudentBilling } from '@/lib/services/billing/student-billing-queries';
import type { StudentParent } from '@/lib/services/student-parent-queries';

import { LessonsCard } from './StudentDetail.Lessons';
import { NextLessonCard } from './StudentDetail.NextLesson';
import { TeacherNoteCard } from './StudentDetail.Note';
import { StudentFeaturesCard } from './StudentDetail.Features';
import { StudentParentCard } from './StudentDetail.Parent';
import { StudentActivity } from './StudentDetail.Activity';
import { StudentPracticeMinutes } from './StudentDetail.PracticeMinutes';
import { PracticeLogCard } from './StudentDetail.PracticeLog';
import { StudentDetailRepertoire } from './StudentDetail.Repertoire';
import { StudentDetailBilling } from './StudentDetail.Billing';
import { SkillsChecklist } from '@/components/curriculum';
import { Card, CardHeader } from './student-detail.shared';

const ALL_TAB_DEFS = [
  { key: 'overview', labelKey: 'detailTabOverview' },
  { key: 'lessons', labelKey: 'detailTabLessons' },
  { key: 'repertoire', labelKey: 'detailTabRepertoire' },
  { key: 'skills', labelKey: 'detailTabSkills' },
  { key: 'practice', labelKey: 'detailTabPractice' },
  { key: 'billing', labelKey: 'detailTabBilling' },
] as const;

type TabKey = (typeof ALL_TAB_DEFS)[number]['key'];

/**
 * Read at render, not at module load: a module-level constant would freeze the
 * flag at import time, which makes the tab list untestable in both states and
 * would silently ignore a flag flip under any kind of module reuse.
 */
const visibleTabs = (hasBilling: boolean): readonly { key: TabKey; labelKey: string }[] =>
  ALL_TAB_DEFS.filter(
    (td) =>
      (SHOW_PRACTICE_FEATURES || td.key !== 'practice') && (hasBilling || td.key !== 'billing')
  );

type Props = {
  repertoire: StudentRepertoireRow[];
  lessons: StudentRecentLesson[];
  practiceHistory: PracticeDay[];
  practiceSessions: PracticeSessionRow[];
  /** Server render time (ms) — keeps "past lesson" filtering pure. */
  now: number;
  nextLesson: NextLesson;
  canEdit: boolean;
  studentId: string;
  studentSkills: StudentSkill[];
  availableSkills: Skill[];
  enabledFeatures: StudentFeature[];
  /** Practice health says at risk — tints the cards red, as in the mockup. */
  isAtRisk: boolean;
  /** Staff only: the "Rozliczenia" tab. Absent, the tab is not shown. */
  billing?: StudentBilling | null;
  /** Staff only: the linked parent, or what the intake form knows about one. */
  parent?: StudentParent | null;
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
  now,
  nextLesson,
  canEdit,
  studentId,
  studentSkills,
  availableSkills,
  enabledFeatures,
  isAtRisk,
  billing,
  parent = null,
}: Props) => {
  const [tab, setTab] = useState<TabKey>('overview');
  const t = useTranslations('Users');
  const tSongs = useTranslations('Songs');
  const tabDefs = visibleTabs(Boolean(billing));

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
            {td.key === 'repertoire' && <span className="ui-tab-count">{repertoire.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="ui-detail-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            {SHOW_PRACTICE_FEATURES && (
              <StudentPracticeMinutes days={practiceHistory} isAtRisk={isAtRisk} />
            )}
            <StudentActivity sessions={practiceSessions} lessons={lessons} now={now} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            <NextLessonCard lesson={nextLesson} studentId={studentId} isAtRisk={isAtRisk} />
            <TeacherNoteCard lessons={lessons} />
            {canEdit && (
              <StudentFeaturesCard studentId={studentId} enabledFeatures={enabledFeatures} />
            )}
            {canEdit && parent && <StudentParentCard studentId={studentId} parent={parent} />}
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
        <SkillsChecklist
          studentId={studentId}
          studentSkills={studentSkills}
          availableSkills={availableSkills}
          canEdit={canEdit}
        />
      )}

      {SHOW_PRACTICE_FEATURES && tab === 'practice' && (
        <PracticeLogCard sessions={practiceSessions} />
      )}

      {billing && tab === 'billing' && (
        <StudentDetailBilling studentId={studentId} billing={billing} />
      )}
    </div>
  );
};
