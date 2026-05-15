import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UpdateSongVideoInputSchema } from '@/schemas/SongVideoSchema';
import { createLogger } from '@/lib/logger';

const log = createLogger('DriveVideosAPI');

async function authorizeAdminOrTeacher() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, is_teacher')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin && !profile?.is_teacher) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { supabase, userId: user.id };
}

/**
 * GET /api/admin/drive-videos
 * All song_videos joined with song title/author, ordered by song title.
 */
export async function GET() {
  try {
    const auth = await authorizeAdminOrTeacher();
    if ('error' in auth) return auth.error;

    const { data: videos, error } = await auth.supabase
      .from('song_videos')
      .select('*, songs(id, title, author)')
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Error fetching videos', { error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ videos: videos ?? [] });
  } catch (error) {
    log.error('Unexpected error fetching videos', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/drive-videos
 * Update video title/display_order. Body: { videoId, songId, updates }
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authorizeAdminOrTeacher();
    if ('error' in auth) return auth.error;

    const body = await request.json();
    const { videoId, songId, updates: rawUpdates } = body;

    if (!videoId || !songId) {
      return NextResponse.json({ error: 'videoId and songId are required' }, { status: 400 });
    }

    const updates = UpdateSongVideoInputSchema.parse(rawUpdates);

    const { data: video, error } = await auth.supabase
      .from('song_videos')
      .update(updates)
      .eq('id', videoId)
      .eq('song_id', songId)
      .select()
      .single();

    if (error) {
      log.error('Error updating video', { error, videoId });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ video });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }
    log.error('Unexpected error updating video', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/drive-videos
 * Delete video from DB. Body: { videoId, songId }
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authorizeAdminOrTeacher();
    if ('error' in auth) return auth.error;

    const body = await request.json();
    const { videoId, songId } = body;

    if (!videoId || !songId) {
      return NextResponse.json({ error: 'videoId and songId are required' }, { status: 400 });
    }

    const { error } = await auth.supabase
      .from('song_videos')
      .delete()
      .eq('id', videoId)
      .eq('song_id', songId);

    if (error) {
      log.error('Error deleting video', { error, videoId });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Unexpected error deleting video', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
