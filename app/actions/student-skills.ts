'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';
import { createLogger } from '@/lib/logger';
import type { Database } from '@/database.types';
import type { SkillStatus } from '@/types/student-skills';

export type { SkillStatus } from '@/types/student-skills';
export type Skill = Database['public']['Tables']['skills']['Row'];
export type StudentSkill = Database['public']['Tables']['student_skills']['Row'] & {
  skill: Skill;
};

const log = createLogger('student-skills');

export async function getSkills(): Promise<Skill[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('skills').select('*').order('category').order('name');

  if (error) {
    log.error('Error fetching skills', { error });
    return [];
  }
  return data;
}

export async function getStudentSkills(studentId: string): Promise<StudentSkill[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('student_skills')
    .select('*, skill:skills(*)')
    .eq('student_id', studentId);

  if (error) {
    log.error('Error fetching student skills', { error, studentId });
    return [];
  }
  return data;
}

export async function upsertStudentSkill(
  studentId: string,
  skillId: string,
  status: SkillStatus,
  notes?: string
) {
  const { user, isTeacher, isAdmin, isDevelopment } = await getUserWithRolesSSR();

  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return { error: guard.error };

  if (!user || (!isTeacher && !isAdmin)) {
    return { error: 'Unauthorized. Only teachers and admins can update skills.' };
  }

  const supabase = await createClient();

  // Check if it already exists
  const { data: existing } = await supabase
    .from('student_skills')
    .select('id')
    .eq('student_id', studentId)
    .eq('skill_id', skillId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('student_skills')
      .update({
        status,
        notes: notes ?? null,
        last_assessed_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) {
      log.error('Error updating student skill', { error, existingId: existing.id });
      return { error: error.message };
    }
  } else {
    const { error } = await supabase.from('student_skills').insert({
      student_id: studentId,
      skill_id: skillId,
      status,
      notes: notes ?? null,
      last_assessed_at: new Date().toISOString(),
    });

    if (error) {
      log.error('Error inserting student skill', { error, studentId, skillId });
      return { error: error.message };
    }
  }

  // Was `/dashboard/users/students/${studentId}/skills`, a route that
  // doesn't exist — the real student detail page is `/dashboard/users/[id]`,
  // so the Skills tab never got revalidated after a write.
  revalidatePath(`/dashboard/users/${studentId}`);
  return { success: true };
}
