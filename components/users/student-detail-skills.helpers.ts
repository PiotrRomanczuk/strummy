import type { Skill, StudentSkill } from '@/app/actions/student-skills';
import type { SkillLevel } from '@/types/StudentSkills';

export type LessonGroup = { lessonNumber: number | null; skills: Skill[] };

// `lessonNumber: null` is the catch-all bucket for skills with no
// `lesson_group` (e.g. the whole `advanced` tier, or any future catalog
// addition that hasn't been mapped into the roadmap yet). Rendering it last,
// with no lesson header, makes it visually identical to the pre-roadmap flat
// list — no separate "flat vs grouped" code path needed.
export const groupSkillsByLesson = (skills: Skill[]): LessonGroup[] => {
  const byLesson = new Map<number, Skill[]>();
  const ungrouped: Skill[] = [];

  for (const skill of skills) {
    if (skill.lesson_group === null || skill.lesson_group === undefined) {
      ungrouped.push(skill);
    } else {
      const bucket = byLesson.get(skill.lesson_group) ?? [];
      bucket.push(skill);
      byLesson.set(skill.lesson_group, bucket);
    }
  }

  const numbered = Array.from(byLesson.entries())
    .sort(([a], [b]) => a - b)
    .map(([lessonNumber, lessonSkills]) => ({ lessonNumber, skills: lessonSkills }));

  return ungrouped.length > 0 ? [...numbered, { lessonNumber: null, skills: ungrouped }] : numbered;
};

// The last mapped lesson in each level's roadmap is a recap / performance
// checkpoint. A plain constant (not a schema column) — cheap to retune as
// the catalog is re-curated, no migration needed.
export const LESSON_MILESTONES: Record<SkillLevel, number[]> = {
  beginner: [11],
  intermediate: [16],
  advanced: [],
};

export const isMilestoneLesson = (level: SkillLevel, lessonNumber: number | null): boolean =>
  lessonNumber !== null && LESSON_MILESTONES[level].includes(lessonNumber);

export type LessonProgress = { masteredCount: number; total: number; pct: number };

// Text label counts `mastered` only, matching the level-tab label
// (`countMastered`) so a teacher never sees two different definitions of
// "progress" on the same screen. The bar's fill uses partial credit for
// `proficient` — a visual-only affordance showing a lesson is coming along
// before every skill in it has been fully mastered.
export const lessonProgress = (
  lessonSkills: Skill[],
  studentSkills: StudentSkill[]
): LessonProgress => {
  const total = lessonSkills.length;
  let credit = 0;
  let masteredCount = 0;

  for (const skill of lessonSkills) {
    const status = studentSkills.find((ss) => ss.skill_id === skill.id)?.status;
    if (status === 'mastered') {
      credit += 1;
      masteredCount += 1;
    } else if (status === 'proficient') {
      credit += 0.5;
    }
  }

  return { masteredCount, total, pct: total === 0 ? 0 : Math.round((credit / total) * 100) };
};
