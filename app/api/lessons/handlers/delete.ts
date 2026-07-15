import { syncLessonDeletion } from '@/lib/services/calendar-lesson-sync';
import { validateMutationPermission } from '@/lib/auth/permissions';
import type { UserProfile, SupabaseClient } from './types';

export async function deleteLessonHandler(
  supabase: SupabaseClient,
  user: { id: string } | null,
  profile: UserProfile | null,
  id: string
): Promise<{ status: number; error?: string }> {
  if (!user) return { error: 'Unauthorized', status: 401 };
  if (!profile) return { error: 'Profile not found', status: 404 };

  if (!validateMutationPermission(profile)) {
    return { error: 'Only admins and teachers can delete lessons', status: 403 };
  }

  await syncLessonDeletion(supabase, id);

  // `.select('id')` makes RLS-blocked/nonexistent rows detectable: an UPDATE
  // matching zero rows (own-teacher RLS policy hides another teacher's
  // lesson) is not a Postgres error, so without this the API would report a
  // false-positive 200 while silently deleting nothing.
  const { data, error } = await supabase
    .from('lessons')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select('id');

  if (error) return { error: error.message, status: 500 };
  if (!data || data.length === 0) return { error: 'Lesson not found', status: 404 };
  return { status: 200 };
}
