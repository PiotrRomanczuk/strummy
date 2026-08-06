'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';
import { createLogger } from '@/lib/logger';
import type { Database } from '@/types/database.types';

export type PromptTemplateRow = Database['public']['Tables']['ai_prompt_templates']['Row'];
export type PromptTemplateUpdate = Database['public']['Tables']['ai_prompt_templates']['Update'];
export type PromptTemplateInsert = Database['public']['Tables']['ai_prompt_templates']['Insert'];

const log = createLogger('admin-prompts');

export async function getPromptTemplates(): Promise<PromptTemplateRow[]> {
  const { isAdmin } = await getUserWithRolesSSR();
  if (!isAdmin) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ai_prompt_templates')
    .select('*')
    .order('category')
    .order('name');

  if (error) {
    log.error('Error fetching prompt templates', { error });
    return [];
  }
  return (data || []) as PromptTemplateRow[];
}

export async function updatePromptTemplate(
  id: string,
  updates: Omit<PromptTemplateUpdate, 'id' | 'created_by'>
) {
  const { isAdmin, isDevelopment } = await getUserWithRolesSSR();
  if (!isAdmin) return { error: 'Unauthorized. Admin only.' };

  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return { error: guard.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from('ai_prompt_templates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    log.error('Error updating prompt template', { error, promptId: id });
    return { error: error.message };
  }

  revalidatePath('/dashboard/admin/prompts');
  return { success: true };
}

export async function createPromptTemplate(
  prompt: Omit<PromptTemplateInsert, 'id' | 'created_by' | 'created_at' | 'updated_at'>
) {
  const { user, profileId, isAdmin, isDevelopment } = await getUserWithRolesSSR();
  if (!isAdmin || !user) return { error: 'Unauthorized. Admin only.' };

  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return { error: guard.error };

  const supabase = await createClient();
  const { error } = await supabase.from('ai_prompt_templates').insert({
    ...prompt,
    created_by: profileId,
  });

  if (error) {
    log.error('Error creating prompt template', { error });
    return { error: error.message };
  }

  revalidatePath('/dashboard/admin/prompts');
  return { success: true };
}
