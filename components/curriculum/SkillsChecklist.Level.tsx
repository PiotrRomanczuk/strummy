'use client';

import type { Skill, StudentSkill } from '@/app/actions/student-skills';
import type { SkillLevel, SkillStatus } from '@/types/StudentSkills';
import { SkillsChecklistLesson } from './SkillsChecklist.Lesson';
import { assessedSkills, groupSkillsByLesson } from './skills-checklist.helpers';

type Props = {
  skills: Skill[];
  studentSkills: StudentSkill[];
  canEdit: boolean;
  isUpdating: boolean;
  onUpdate: (skillId: string, status: SkillStatus) => void;
  level: SkillLevel;
  /** Student view: hide unassessed rows, and lessons left with none. */
  assessedOnly?: boolean;
};

export const SkillsChecklistLevel = ({
  skills,
  studentSkills,
  canEdit,
  isUpdating,
  onUpdate,
  level,
  assessedOnly = false,
}: Props) => {
  const lessons = groupSkillsByLesson(skills).filter(
    // A lesson whose skills are all unassessed would render as a header and an
    // empty progress bar. Drop it — but only from the student's view, where the
    // whole point is to show what HAS happened.
    (lesson) => !assessedOnly || assessedSkills(lesson.skills, studentSkills).length > 0
  );

  return (
    <div>
      {lessons.map((lesson) => (
        <SkillsChecklistLesson
          key={lesson.lessonNumber ?? 'ungrouped'}
          lesson={lesson}
          level={level}
          studentSkills={studentSkills}
          canEdit={canEdit}
          isUpdating={isUpdating}
          onUpdate={onUpdate}
          assessedOnly={assessedOnly}
        />
      ))}
    </div>
  );
};
