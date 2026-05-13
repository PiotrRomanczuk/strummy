import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');

    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status });
    }
    const userId = auth.user.id;
    const supabase = createAdminClient();

    // 1. Verify user has teacher or admin role via profiles boolean flags
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, is_teacher')
      .eq('id', userId)
      .single();

    if (profileError || !profile || (!profile.is_admin && !profile.is_teacher)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // 2. Fetch all songs (teachers and admins can see all)
    let query = supabase
      .from('songs')
      .select(
        'id, title, author, level, key, chords, youtube_url, ultimate_guitar_link, gallery_images, created_at, updated_at'
      );

    if (level) {
      query = query.eq('level', level as 'beginner' | 'intermediate' | 'advanced');
    }

    const { data: songs, error: songsError } = await query;

    if (songsError) {
      return NextResponse.json({ error: 'Failed to fetch songs' }, { status: 500 });
    }

    return NextResponse.json(songs || []);
  } catch (error) {
    logger.error('Error in admin-songs route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
