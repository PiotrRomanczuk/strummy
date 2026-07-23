'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { assertNotTestAccount } from '@/lib/auth/test-account-guard';
import { AssignmentTemplateInputSchema, AssignmentTemplateUpdateSchema } from '@/schemas';
import { ChecklistSchema } from '@/schemas/AssignmentSchema';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export async function createAssignmentTemplate(
  data: z.infer<typeof AssignmentTemplateInputSchema>
) {
  const { isAdmin, isTeacher, user, isDevelopment } = await getUserWithRolesSSR();
  assertNotTestAccount(isDevelopment);

  if ((!isAdmin && !isTeacher) || !user) {
    throw new Error('Unauthorized');
  }

  const result = AssignmentTemplateInputSchema.safeParse(data);
  if (!result.success) {
    throw new Error('Invalid data');
  }

  const supabase = await createClient();

  const { error } = await supabase.from('assignment_templates').insert({
    ...result.data,
    teacher_id: user.id, // Enforce teacher_id to be the current user
  });

  if (error) {
    logger.error('Error creating assignment template:', error);
    throw new Error('Failed to create assignment template');
  }

  revalidatePath('/dashboard/assignments/templates');
}

/**
 * Create a reusable template from an existing assignment (teacher/admin only).
 * Copies the assignment's title, brief, and checklist — the checklist is reset
 * to unchecked, since a template seeds future work rather than mirrors progress.
 * Reads the source assignment server-side (RLS-scoped) so the copy is
 * authoritative, not client-supplied. Powers both the detail-page "Save as
 * template" button and the create form's "also save as template" checkbox.
 */
export async function saveAssignmentAsTemplate(
  assignmentId: string
): Promise<{ templateId: string }> {
  const { isAdmin, isTeacher, user, isDevelopment } = await getUserWithRolesSSR();
  assertNotTestAccount(isDevelopment);

  if ((!isAdmin && !isTeacher) || !user) {
    throw new Error('Unauthorized');
  }

  const supabase = await createClient();

  const { data: assignment, error: readError } = await supabase
    .from('assignments')
    .select('title, description, checklist')
    .eq('id', assignmentId)
    .is('deleted_at', null)
    .single();

  if (readError || !assignment) {
    logger.error('Error reading assignment for template:', readError);
    throw new Error('Assignment not found');
  }

  const checklist = (ChecklistSchema.safeParse(assignment.checklist).data ?? []).map((item) => ({
    ...item,
    done: false,
  }));

  const { data: created, error } = await supabase
    .from('assignment_templates')
    .insert({
      title: assignment.title,
      description: assignment.description ?? null,
      teacher_id: user.id, // Enforce ownership on the current user
      checklist,
    })
    .select('id')
    .single();

  if (error || !created) {
    logger.error('Error saving assignment as template:', error);
    throw new Error('Failed to save template');
  }

  revalidatePath('/dashboard/assignments/templates');
  return { templateId: created.id as string };
}

export async function updateAssignmentTemplate(
  data: z.infer<typeof AssignmentTemplateUpdateSchema>
) {
  const { isAdmin, isTeacher, user, isDevelopment } = await getUserWithRolesSSR();
  assertNotTestAccount(isDevelopment);

  if ((!isAdmin && !isTeacher) || !user) {
    throw new Error('Unauthorized');
  }

  const result = AssignmentTemplateUpdateSchema.safeParse(data);
  if (!result.success) {
    throw new Error('Invalid data');
  }

  const supabase = await createClient();

  // Check ownership if not admin
  if (!isAdmin) {
    const { data: template } = await supabase
      .from('assignment_templates')
      .select('teacher_id')
      .eq('id', result.data.id)
      .single();

    if (!template || template.teacher_id !== user.id) {
      throw new Error('Unauthorized');
    }
  }

  const { error } = await supabase
    .from('assignment_templates')
    .update(result.data)
    .eq('id', result.data.id);

  if (error) {
    logger.error('Error updating assignment template:', error);
    throw new Error('Failed to update assignment template');
  }

  revalidatePath('/dashboard/assignments/templates');
}

export async function deleteAssignmentTemplate(id: string) {
  const { isAdmin, isTeacher, user, isDevelopment } = await getUserWithRolesSSR();
  assertNotTestAccount(isDevelopment);

  if ((!isAdmin && !isTeacher) || !user) {
    throw new Error('Unauthorized');
  }

  const supabase = await createClient();

  // Check ownership if not admin
  if (!isAdmin) {
    const { data: template } = await supabase
      .from('assignment_templates')
      .select('teacher_id')
      .eq('id', id)
      .single();

    if (!template || template.teacher_id !== user.id) {
      throw new Error('Unauthorized');
    }
  }

  const { error } = await supabase.from('assignment_templates').delete().eq('id', id);

  if (error) {
    logger.error('Error deleting assignment template:', error);
    throw new Error('Failed to delete assignment template');
  }

  revalidatePath('/dashboard/assignments/templates');
}
