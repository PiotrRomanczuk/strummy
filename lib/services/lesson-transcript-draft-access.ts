import { createAdminClient } from '@/lib/supabase/admin';

/**
 * API routes for transcript drafts accept `Bearer gcrm_…` keys, which carry no
 * Supabase session — the cookie client would see nothing under RLS. So, like
 * /api/transcripts/ingest, they use the admin client, and this check stands in
 * for can_manage_lesson: admin, or the teacher who owns the lesson.
 */

type Actor = { profileId: string; roles: { isAdmin: boolean; isTeacher: boolean } };

export type ManagedLessonAccess =
  | { ok: true; supabase: ReturnType<typeof createAdminClient> }
  | { ok: false; status: 403 | 404; error: string };

export async function managedLessonClient(lessonId: string, actor: Actor): Promise<ManagedLessonAccess> {
  if (!actor.roles.isAdmin && !actor.roles.isTeacher) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  const supabase = createAdminClient();
  const { data: lesson } = await supabase
    .from('lessons')
    .select('teacher_id')
    .eq('id', lessonId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!lesson) return { ok: false, status: 404, error: 'Lesson not found' };
  if (!actor.roles.isAdmin && lesson.teacher_id !== actor.profileId) {
    // Same answer as a missing lesson: do not confirm other teachers' lesson ids.
    return { ok: false, status: 404, error: 'Lesson not found' };
  }
  return { ok: true, supabase };
}
