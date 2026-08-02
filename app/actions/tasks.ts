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
  const { user } = await getUserWithRolesSSR();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('task_management')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    log.error('Error fetching tasks', { error, userId: user.id });
    return [];
  }
  return (data || []) as TaskRow[];
}

export async function createTask(task: Omit<TaskInsert, 'user_id' | 'id' | 'created_at' | 'updated_at'>) {
  const { user, isDevelopment } = await getUserWithRolesSSR();
  if (!user) return { error: 'Unauthorized' };

  const guard = guardTestAccountMutation(isDevelopment);
  console.error('[DEBUG] createTask guard:', guard, 'isDevelopment:', isDevelopment, 'env:', process.env.DEMO_WRITES_ENABLED);
  if (guard) return { error: guard.error };

  const supabase = await createClient();
  const { error } = await supabase.from('task_management').insert({
    ...task,
    user_id: user.id,
  });

  if (error) {
    log.error('Error creating task', { error, userId: user.id });
    return { error: error.message };
  }

  revalidatePath('/dashboard/tasks');
  return { success: true };
}

export async function updateTask(id: string, updates: Omit<TaskUpdate, 'id' | 'user_id'>) {
  const { user, isDevelopment } = await getUserWithRolesSSR();
  if (!user) return { error: 'Unauthorized' };

  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return { error: guard.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from('task_management')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    log.error('Error updating task', { error, userId: user.id, taskId: id });
    return { error: error.message };
  }

  revalidatePath('/dashboard/tasks');
  return { success: true };
}

export async function deleteTask(id: string) {
  const { user, isDevelopment } = await getUserWithRolesSSR();
  if (!user) return { error: 'Unauthorized' };

  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return { error: guard.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from('task_management')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    log.error('Error deleting task', { error, userId: user.id, taskId: id });
    return { error: error.message };
  }

  revalidatePath('/dashboard/tasks');
  return { success: true };
}
