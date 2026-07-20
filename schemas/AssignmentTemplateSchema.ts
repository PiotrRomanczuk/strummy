import * as z from 'zod';
import { IdField } from './CommonSchema';
import { ChecklistInputSchema } from './AssignmentSchema';

// Assignment Template schema for validation
export const AssignmentTemplateSchema = z.object({
  id: IdField, // UUID, auto-generated
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  teacher_id: z.string().uuid(),
  checklist: ChecklistInputSchema,
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

// Assignment Template input schema for creating templates
export const AssignmentTemplateInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  teacher_id: z.string().uuid(),
  checklist: ChecklistInputSchema, // only carried when authored (no default injected)
});

// Assignment Template update schema (partial of input)
export const AssignmentTemplateUpdateSchema = AssignmentTemplateInputSchema.partial().extend({
  id: z.string().uuid(),
});

export type AssignmentTemplate = z.infer<typeof AssignmentTemplateSchema>;
export type AssignmentTemplateInput = z.infer<typeof AssignmentTemplateInputSchema>;
export type AssignmentTemplateUpdate = z.infer<typeof AssignmentTemplateUpdateSchema>;
