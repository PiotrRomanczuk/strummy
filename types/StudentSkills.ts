// Mirrors the student_skills_status_check constraint (20260805110000) and the
// terminology lib/ai/agents/post-lesson-summary.ts already uses in its own
// prompt — teacher-entered and AI-suggested assessments speak one vocabulary.
//
// Lives outside app/actions/student-skills.ts on purpose: that file has
// 'use server', which may only export async functions — a runtime const
// array there breaks the production build ("A 'use server' file can only
// export async functions, found object").
export const SKILL_STATUSES = ['developing', 'progressing', 'proficient', 'mastered'] as const;
export type SkillStatus = (typeof SKILL_STATUSES)[number];

// Mirrors the skills_level_check constraint (20260811090000) — the curriculum
// tier a catalog skill belongs to, used to group the student-detail checklist.
export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];
