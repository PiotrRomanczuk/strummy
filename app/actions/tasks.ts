'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';
import { createLogger } from '@/lib/logger';
import type { Database } from '@/database.types';

export type TaskRow = Database['public']['Tables']['task_management']['Row'];
export type TaskInsert = Database['public']['Tables']['task_management']['Insert'];
export type TaskUpdate = Database['public']['Tables']['task_management']['Update'];

const log = createLogger('tasks');

export async function getTasks(): Promise<TaskRow[]> {
  const { user, profileId } = await getUserWithRolesSSR();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('task_management')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });

  if (error) {
    log.error('Error fetching tasks', { error, profileId });
    return [];
  }
  return (data || []) as TaskRow[];
}

export async function createTask(
  task: Omit<TaskInsert, 'profile_id' | 'id' | 'created_at' | 'updated_at'>
) {
  const { user, profileId, isDevelopment } = await getUserWithRolesSSR();
  if (!user) return { error: 'Unauthorized' };

  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return { error: guard.error };

  const supabase = await createClient();
  const { error } = await supabase.from('task_management').insert({
    ...task,
    profile_id: profileId,
  });

  if (error) {
    log.error('Error creating task', { error, profileId });
    return { error: error.message };
  }

  revalidatePath('/dashboard/tasks');
  return { success: true };
}

export async function updateTask(id: string, updates: Omit<TaskUpdate, 'id' | 'profile_id'>) {
  const { user, profileId, isDevelopment } = await getUserWithRolesSSR();
  if (!user) return { error: 'Unauthorized' };

  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return { error: guard.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from('task_management')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('profile_id', profileId);

  if (error) {
    log.error('Error updating task', { error, profileId, taskId: id });
    return { error: error.message };
  }

  revalidatePath('/dashboard/tasks');
  return { success: true };
}

export async function deleteTask(id: string) {
  const { user, profileId, isDevelopment } = await getUserWithRolesSSR();
  if (!user) return { error: 'Unauthorized' };

  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return { error: guard.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from('task_management')
    .delete()
    .eq('id', id)
    .eq('profile_id', profileId);

  if (error) {
    log.error('Error deleting task', { error, profileId, taskId: id });
    return { error: error.message };
  }

  revalidatePath('/dashboard/tasks');
  return { success: true };
}
