'use client';

import { useTranslations } from 'next-intl';

import type { StudentSkill } from '@/app/actions/student-skills';
import type { SkillLevel, SkillStatus } from '@/types/StudentSkills';
import { SkillRow } from './StudentDetail.Skills.Row';
import {
  isMilestoneLesson,
  lessonProgress,
  type LessonGroup,
} from './student-detail-skills.helpers';

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
};

export const StudentDetailSkillsLesson = ({
  lesson,
  level,
  studentSkills,
  canEdit,
  isUpdating,
  onUpdate,
}: Props) => {
  const { lessonNumber, skills } = lesson;
  const isMilestone = isMilestoneLesson(level, lessonNumber);
  const { masteredCount, total, pct } = lessonProgress(skills, studentSkills);

  return (
    <div style={{ marginBottom: 18 }}>
      <LessonHeader
        lessonNumber={lessonNumber}
        isMilestone={isMilestone}
        masteredCount={masteredCount}
        total={total}
      />
      <LessonProgressBar pct={pct} />
      {skills.map((skill, i) => (
        <SkillRow
          key={skill.id}
          row={{ skill, studentSkill: studentSkills.find((ss) => ss.skill_id === skill.id) }}
          isLast={i === skills.length - 1}
          canEdit={canEdit}
          isUpdating={isUpdating}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
};
