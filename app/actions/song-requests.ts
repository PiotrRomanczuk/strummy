'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';
import {
  SongRequestFormSchema,
  SongRequestReviewSchema,
  type SongRequestFormData,
  type SongRequestReviewData,
  type SongRequestRow,
  type SongRequestWithStudent,
} from '@/schemas/SongRequestSchema';
import { logger } from '@/lib/logger';

export interface SubmitSongRequestResult {
  success: boolean;
  error?: string;
  request?: SongRequestRow;
}

/**
 * Student submits a song request
 */
export async function submitSongRequest(
  formData: SongRequestFormData
): Promise<SubmitSongRequestResult> {
  const { user, profileId, isStudent, isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return guard;

  if (!user || !profileId) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!isStudent) {
    return { success: false, error: 'Only students can submit song requests' };
  }

  const parsed = SongRequestFormSchema.safeParse(formData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid form data';
    return { success: false, error: firstError };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('song_requests')
    .insert({
      student_id: profileId,
      title: parsed.data.title,
      artist: parsed.data.artist || null,
      notes: parsed.data.notes || null,
      url: parsed.data.url || null,
    })
    .select()
    .single();

  if (error) {
    logger.error('[submitSongRequest] Error:', error);
    return { success: false, error: 'Failed to submit request' };
  }

  revalidatePath('/dashboard/songs');
  return { success: true, request: data as SongRequestRow };
}

export interface GetSongRequestsResult {
  requests: SongRequestWithStudent[];
  error?: string;
}

/**
 * Get song requests. Students see their own; teachers see all.
 */
export async function getSongRequests(
  statusFilter?: string
): Promise<GetSongRequestsResult> {
  const { user, profileId, isAdmin, isTeacher, isStudent } = await getUserWithRolesSSR();

  if (!user || !profileId) {
    return { requests: [], error: 'Not authenticated' };
  }

  const supabase = await createClient();

  let query = supabase
    .from('song_requests')
    .select('*, student:profiles!song_requests_student_id_fkey(id, full_name)')
    .order('created_at', { ascending: false });

  // Students only see their own (RLS handles this, but be explicit)
  if (isStudent && !isAdmin && !isTeacher) {
    query = query.eq('student_id', profileId);
  }

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('[getSongRequests] Error:', error);
    return { requests: [], error: 'Failed to load requests' };
  }

  return { requests: (data ?? []) as SongRequestWithStudent[] };
}

export interface ReviewSongRequestResult {
  success: boolean;
  error?: string;
}

/**
 * Teacher approves or rejects a song request
 */
export async function reviewSongRequest(
  requestId: string,
  reviewData: SongRequestReviewData
): Promise<ReviewSongRequestResult> {
  const { user, profileId, isAdmin, isTeacher, isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return guard;

  if (!user || !profileId) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!isAdmin && !isTeacher) {
    return { success: false, error: 'Unauthorized' };
  }

  const parsed = SongRequestReviewSchema.safeParse(reviewData);
  if (!parsed.success) {
    return { success: false, error: 'Invalid review data' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('song_requests')
    .update({
      status: parsed.data.status,
      review_notes: parsed.data.reviewNotes || null,
      reviewed_by: profileId,
    })
    .eq('id', requestId);

  if (error) {
    logger.error('[reviewSongRequest] Error:', error);
    return { success: false, error: 'Failed to review request' };
  }

  revalidatePath('/dashboard/songs');
  return { success: true };
}
