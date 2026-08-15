'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';
import { TheoryCourseInputSchema, TheoryLessonInputSchema } from '@/schemas/TheoryLessonSchema';
import { logger } from '@/lib/logger';

// ============================================================================
// COURSES
// ============================================================================

export async function getTheoryCourses() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('theoretical_courses')
    .select(`
      id, title, description, cover_image_url, level,
      is_published, sort_order, created_at,
      theoretical_lessons(id)
    `)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  if (error) {
    logger.error('[getTheoryCourses] Error:', error);
    return [];
  }

  return (data ?? []).map((c) => ({
    ...c,
    lesson_count: c.theoretical_lessons?.length ?? 0,
    theoretical_lessons: undefined,
  }));
}

export async function getTheoryCourse(courseId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('theoretical_courses')
    .select(`
      *,
      creator:profiles!theoretical_courses_created_by_fkey(id, full_name),
      lessons:theoretical_lessons(
        id, title, excerpt, is_published, sort_order, created_at
      )
    `)
    .eq('id', courseId)
    .is('deleted_at', null)
    .single();

  if (error) {
    logger.error('[getTheoryCourse] Error:', error);
    return null;
  }

  // Sort lessons by sort_order
  if (data?.lessons) {
    data.lessons.sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
    );
  }

  return data;
}

export async function createTheoryCourse(input: unknown) {
  const { user, profileId, isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return guard;

  if (!user || !profileId) return { success: false, error: 'Not authenticated' };

  const parsed = TheoryCourseInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const supabase = await createClient();

  // Get next sort_order
  const { data: maxRow } = await supabase
    .from('theoretical_courses')
    .select('sort_order')
    .is('deleted_at', null)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from('theoretical_courses')
    .insert({
      ...parsed.data,
      cover_image_url: parsed.data.cover_image_url || null,
      created_by: profileId,
      sort_order: nextOrder,
      published_at: parsed.data.is_published ? new Date().toISOString() : null,
    })
    .select('id')
    .single();

  if (error) {
    logger.error('[createTheoryCourse] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/theory');
  return { success: true, courseId: data.id };
}

export async function updateTheoryCourse(courseId: string, input: unknown) {
  const { isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return guard;

  const parsed = TheoryCourseInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const supabase = await createClient();

  // Check if published state changed
  const { data: existing } = await supabase
    .from('theoretical_courses')
    .select('is_published')
    .eq('id', courseId)
    .single();

  const publishedAt =
    parsed.data.is_published && !existing?.is_published
      ? new Date().toISOString()
      : undefined;

  const updateData: Record<string, unknown> = {
    ...parsed.data,
    cover_image_url: parsed.data.cover_image_url || null,
  };
  if (publishedAt) updateData.published_at = publishedAt;

  const { error } = await supabase
    .from('theoretical_courses')
    .update(updateData)
    .eq('id', courseId);

  if (error) {
    logger.error('[updateTheoryCourse] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/theory');
  revalidatePath(`/dashboard/theory/${courseId}`);
  return { success: true };
}

export async function deleteTheoryCourse(courseId: string) {
  const { isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return guard;

  const supabase = await createClient();

  const { error } = await supabase
    .from('theoretical_courses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', courseId);

  if (error) {
    logger.error('[deleteTheoryCourse] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/theory');
  return { success: true };
}

// ============================================================================
// LESSONS (CHAPTERS)
// ============================================================================

export async function getTheoryLesson(lessonId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('theoretical_lessons')
    .select(`
      *,
      course:theoretical_courses(id, title, created_by)
    `)
    .eq('id', lessonId)
    .is('deleted_at', null)
    .single();

  if (error) {
    logger.error('[getTheoryLesson] Error:', error);
    return null;
  }

  return data;
}

export async function createTheoryLesson(courseId: string, input: unknown) {
  const { isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return guard;

  const parsed = TheoryLessonInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const supabase = await createClient();

  // Get next sort_order for this course
  const { data: maxRow } = await supabase
    .from('theoretical_lessons')
    .select('sort_order')
    .eq('course_id', courseId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from('theoretical_lessons')
    .insert({
      ...parsed.data,
      course_id: courseId,
      sort_order: nextOrder,
      published_at: parsed.data.is_published ? new Date().toISOString() : null,
    })
    .select('id')
    .single();

  if (error) {
    logger.error('[createTheoryLesson] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/theory/${courseId}`);
  return { success: true, lessonId: data.id };
}

export async function updateTheoryLesson(lessonId: string, courseId: string, input: unknown) {
  const { isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return guard;

  const parsed = TheoryLessonInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('theoretical_lessons')
    .select('is_published')
    .eq('id', lessonId)
    .single();

  const publishedAt =
    parsed.data.is_published && !existing?.is_published
      ? new Date().toISOString()
      : undefined;

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (publishedAt) updateData.published_at = publishedAt;

  const { error } = await supabase
    .from('theoretical_lessons')
    .update(updateData)
    .eq('id', lessonId);

  if (error) {
    logger.error('[updateTheoryLesson] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/theory/${courseId}`);
  revalidatePath(`/dashboard/theory/${courseId}/${lessonId}`);
  return { success: true };
}

export async function deleteTheoryLesson(lessonId: string, courseId: string) {
  const { isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return guard;

  const supabase = await createClient();

  const { error } = await supabase
    .from('theoretical_lessons')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', lessonId);

  if (error) {
    logger.error('[deleteTheoryLesson] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/theory/${courseId}`);
  return { success: true };
}

// ============================================================================
// ACCESS CONTROL
// ============================================================================

export async function getCourseAccess(courseId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('theoretical_course_access')
    .select(`
      id, course_id, profile_id, granted_by, granted_at,
      user:profiles!theoretical_course_access_user_id_fkey(id, full_name, email)
    `)
    .eq('course_id', courseId)
    .order('granted_at', { ascending: false });

  if (error) {
    logger.error('[getCourseAccess] Error:', error);
    return [];
  }

  // TypeScript workaround: Supabase infers user as array but it's a single object
  return (data ?? []) as unknown as Array<{
    id: string;
    course_id: string;
    profile_id: string;
    granted_by: string;
    granted_at: string;
    user: { id: string; full_name: string | null; email: string } | null;
  }>;
}

export async function grantCourseAccess(courseId: string, userIds: string[]) {
  const { user, profileId, isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return guard;

  if (!user || !profileId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();

  const rows = userIds.map((userId) => ({
    course_id: courseId,
    profile_id: userId,
    granted_by: profileId,
  }));

  const { error } = await supabase
    .from('theoretical_course_access')
    .upsert(rows, { onConflict: 'course_id,profile_id' });

  if (error) {
    logger.error('[grantCourseAccess] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/theory/${courseId}`);
  return { success: true };
}

export async function revokeCourseAccess(courseId: string, userId: string) {
  const { isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return guard;

  const supabase = await createClient();

  const { error } = await supabase
    .from('theoretical_course_access')
    .delete()
    .eq('course_id', courseId)
    .eq('profile_id', userId);

  if (error) {
    logger.error('[revokeCourseAccess] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/theory/${courseId}`);
  return { success: true };
}

export async function getStudentsList() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('is_student', true)
    .eq('is_active', true)
    .order('full_name');

  if (error) {
    logger.error('[getStudentsList] Error:', error);
    return [];
  }

  return data ?? [];
}
