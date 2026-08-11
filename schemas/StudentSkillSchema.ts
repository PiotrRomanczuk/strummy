import * as z from 'zod';
import { UUIDPattern } from './CommonSchema';
import { SKILL_LEVELS, SKILL_STATUSES } from '@/types/StudentSkills';

export const SkillStatusEnum = z.enum(SKILL_STATUSES);
export const SkillLevelEnum = z.enum(SKILL_LEVELS);

export const SkillSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.string(),
  description: z.string().nullable().optional(),
  level: SkillLevelEnum.nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const StudentSkillSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  skill_id: z.string().uuid(),
  status: SkillStatusEnum,
  notes: z.string().nullable().optional(),
  last_assessed_at: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const UpsertStudentSkillInputSchema = z.object({
  student_id: UUIDPattern,
  skill_id: UUIDPattern,
  status: SkillStatusEnum,
  notes: z.string().max(1000).nullable().optional(),
});

export type Skill = z.infer<typeof SkillSchema>;
export type StudentSkillType = z.infer<typeof StudentSkillSchema>;
export type UpsertStudentSkillInput = z.infer<typeof UpsertStudentSkillInputSchema>;
