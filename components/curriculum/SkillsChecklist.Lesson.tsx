'use client';

import { useTranslations } from 'next-intl';

import type { StudentSkill } from '@/app/actions/student-skills';
import type { SkillLevel, SkillStatus } from '@/types/StudentSkills';
import { SkillRow } from './SkillsChecklist.Row';
import {
  assessedSkills,
  isMilestoneLesson,
  lessonProgress,
  type LessonGroup,
} from './skills-checklist.helpers';

const LessonHeader = ({
  lessonNumber,
  isMilestone,
  masteredCount,
  total,
}: {
  lessonNumber: number | null;
  isMilestone: boolean;
  masteredCount: number;
  total: number;
}) => {
  const t = useTranslations('Users');
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '0 22px 8px' }}>
      <span
        style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, fontWeight: 600 }}
      >
        {lessonNumber === null
          ? t('skillsLessonUngrouped')
          : t('skillsLessonLabel', { number: lessonNumber })}
      </span>
      {isMilestone ? (
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            color: 'var(--gold-2)',
            border: '1px solid var(--gold-2)',
            borderRadius: 999,
            padding: '2px 8px',
          }}
        >
          {t('skillsLessonMilestone')}
        </span>
      ) : null}
      <span
        style={{
          marginLeft: 'auto',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-4)',
        }}
      >
        {t('skillsProgressCount', { done: masteredCount, total })}
      </span>
    </div>
  );
};

const LessonProgressBar = ({ pct }: { pct: number }) => (
  <div style={{ padding: '0 22px 10px' }}>
    <div style={{ height: 4, borderRadius: 999, background: 'var(--rule)', overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 999,
          background: 'var(--success)',
        }}
      />
    </div>
  </div>
);

type Props = {
  lesson: LessonGroup;
  level: SkillLevel;
  studentSkills: StudentSkill[];
  canEdit: boolean;
  isUpdating: boolean;
  onUpdate: (skillId: string, status: SkillStatus) => void;
  onSaveNote?: (skillId: string, notes: string) => void;
  /** Student view: render only assessed rows. */
  assessedOnly?: boolean;
};

export const SkillsChecklistLesson = ({
  lesson,
  level,
  studentSkills,
  canEdit,
  isUpdating,
  onUpdate,
  onSaveNote,
  assessedOnly = false,
}: Props) => {
  const { lessonNumber, skills } = lesson;
  const isMilestone = isMilestoneLesson(level, lessonNumber);
  // Progress is deliberately measured against the WHOLE lesson, not the visible
  // subset: "2/3 mastered" over two rendered rows is what tells a student there
  // is a third skill still to come, without listing something nobody has
  // assessed yet. Filtering the denominator too would always read "2/2" and
  // quietly claim the lesson was finished.
  const { masteredCount, total, pct } = lessonProgress(skills, studentSkills);
  const visibleSkills = assessedOnly ? assessedSkills(skills, studentSkills) : skills;

  return (
    <div style={{ marginBottom: 18 }}>
      <LessonHeader
        lessonNumber={lessonNumber}
        isMilestone={isMilestone}
        masteredCount={masteredCount}
        total={total}
      />
      <LessonProgressBar pct={pct} />
      {visibleSkills.map((skill, i) => (
        <SkillRow
          key={skill.id}
          row={{ skill, studentSkill: studentSkills.find((ss) => ss.skill_id === skill.id) }}
          isLast={i === visibleSkills.length - 1}
          canEdit={canEdit}
          isUpdating={isUpdating}
          onUpdate={onUpdate}
          onSaveNote={onSaveNote}
        />
      ))}
    </div>
  );
};
