'use client';

import type { Skill, StudentSkill } from '@/app/actions/student-skills';
import type { SkillLevel, SkillStatus } from '@/types/StudentSkills';
import { StudentDetailSkillsLesson } from './StudentDetail.Skills.Lesson';
import { groupSkillsByLesson } from './student-detail-skills.helpers';

type Props = {
  skills: Skill[];
  studentSkills: StudentSkill[];
  canEdit: boolean;
  isUpdating: boolean;
  onUpdate: (skillId: string, status: SkillStatus) => void;
  level: SkillLevel;
};

export const StudentDetailSkillsLevel = ({
  skills,
  studentSkills,
  canEdit,
  isUpdating,
  onUpdate,
  level,
}: Props) => {
  const lessons = groupSkillsByLesson(skills);

  return (
    <div>
      {lessons.map((lesson) => (
        <StudentDetailSkillsLesson
          key={lesson.lessonNumber ?? 'ungrouped'}
          lesson={lesson}
          level={level}
          studentSkills={studentSkills}
          canEdit={canEdit}
          isUpdating={isUpdating}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
};
