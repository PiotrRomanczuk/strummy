/**
 * Curriculum — the skill catalog and per-student assessment (blueprint doc 11).
 *
 * Deliberately NOT `components/skills/`: that directory belongs to the chord
 * quiz (doc 05), a different domain that happens to share the word. The two
 * were confusable enough to ship a nav item pointing at the wrong one (SKL-2).
 */
export { SkillsChecklist } from './SkillsChecklist';
export type { LessonGroup, LessonProgress } from './skills-checklist.helpers';
export {
  assessedSkills,
  countMastered,
  firstAssessedLevel,
  groupSkillsByLesson,
  groupSkillsByLevel,
  isMilestoneLesson,
  lessonProgress,
  LESSON_MILESTONES,
} from './skills-checklist.helpers';
