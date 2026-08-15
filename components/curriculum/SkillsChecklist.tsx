'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

// Cross-domain import, knowingly left in place: these three are pure
// presentation and `student-detail.shared` declares itself client-safe, but they
// are misfiled — promoting them to `components/shared/` would touch eight
// `StudentDetail.*` files, which is not this change. Known follow-up.
import { Card, CardHeader, Empty } from '@/components/users/student-detail.shared';
import { SkillsChecklistLevel } from './SkillsChecklist.Level';
import { ErrorNote, LevelTabs } from './SkillsChecklist.Tabs';
import { assessedSkills, firstAssessedLevel, groupSkillsByLevel } from './skills-checklist.helpers';
import { useSkillAssessment } from './useSkillAssessment';
import type { Skill, StudentSkill } from '@/app/actions/student-skills';
import type { SkillLevel } from '@/types/StudentSkills';

type Props = {
  studentId: string;
  studentSkills: StudentSkill[];
  availableSkills: Skill[];
  canEdit: boolean;
  /** Whose voice the header speaks in. Only the three header strings differ. */
  variant?: 'teacher' | 'student';
  /**
   * Show only skills the teacher has assessed. On for the student's own view:
   * the catalog is ~79 entries, and opening on a wall of "not started" reads as
   * "you have learned nothing" — the opposite of what this screen is for.
   * Lesson progress still counts against the FULL lesson, so "2/3 mastered"
   * stays true and shows there is more to come without listing it.
   */
  assessedOnly?: boolean;
};

export const SkillsChecklist = ({
  studentId,
  studentSkills,
  availableSkills,
  canEdit,
  variant = 'teacher',
  assessedOnly = false,
}: Props) => {
  const t = useTranslations('Users');
  const suffix = variant === 'student' ? 'Student' : '';
  const { isUpdating, error, updateStatus, saveNote } = useSkillAssessment(
    studentId,
    studentSkills
  );
  const [activeLevel, setActiveLevel] = useState<SkillLevel>(() =>
    assessedOnly ? firstAssessedLevel(availableSkills, studentSkills) : 'beginner'
  );

  const skillsByLevel = useMemo(() => groupSkillsByLevel(availableSkills), [availableSkills]);
  const activeSkills = skillsByLevel.get(activeLevel) ?? [];
  const hasNothingAssessed = assessedOnly && studentSkills.length === 0;
  // A student on a level they have not reached yet: the catalog has plenty
  // here, so `activeSkills` is not empty and the level would render its lessons
  // — all of which the assessed-only filter then removes, leaving a blank panel
  // with no explanation. Distinct from "no skills catalogued", which is a
  // statement about the catalog and would be false to show a student.
  const hasNothingAtLevel =
    assessedOnly && assessedSkills(activeSkills, studentSkills).length === 0;

  return (
    <Card>
      <CardHeader
        eyebrow={t(`detailSkillsEyebrow${suffix}`)}
        title={t(`detailSkillsTitle${suffix}`)}
      />
      <div style={{ padding: '0 22px 4px', marginTop: 16 }}>
        <p
          style={{
            fontFamily: 'var(--sans)',
            fontSize: 13,
            color: 'var(--ink-3)',
            marginBottom: 14,
          }}
        >
          {t(`detailSkillsIntro${suffix}`)}
        </p>
        {/* Nothing assessed yet: the tabs would all read 0/N and every panel
            would be empty, so the empty state replaces them rather than sitting
            under them. */}
        {!hasNothingAssessed && (
          <LevelTabs
            skillsByLevel={skillsByLevel}
            studentSkills={studentSkills}
            activeLevel={activeLevel}
            onSelect={setActiveLevel}
          />
        )}
      </div>

      {hasNothingAssessed ? (
        <Empty>{t('skillsEmptyStudent')}</Empty>
      ) : activeSkills.length === 0 ? (
        <Empty>{t('skillsEmptyLevel')}</Empty>
      ) : hasNothingAtLevel ? (
        <Empty>{t('skillsEmptyLevelStudent')}</Empty>
      ) : (
        <SkillsChecklistLevel
          skills={activeSkills}
          studentSkills={studentSkills}
          canEdit={canEdit}
          isUpdating={isUpdating}
          onUpdate={updateStatus}
          onSaveNote={saveNote}
          level={activeLevel}
          assessedOnly={assessedOnly}
        />
      )}

      <ErrorNote message={error} />
    </Card>
  );
};
