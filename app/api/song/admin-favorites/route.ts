import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import type { Song } from '@/components/songs/types';

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status });
  }

  const userId = auth.user.id;
  const supabase = createAdminClient();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();
  if (profileError) {
    return NextResponse.json({ error: 'Error fetching user profile' }, { status: 500 });
  }
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { data, error } = await supabase
    .from('user_favorites')
    .select('song:song_id(*), profiles!inner(isAdmin, user_id)')
    .eq('user_id', userId)
    .eq('profiles.isAdmin', true);
  if (error) {
    logger.error('Error fetching admin favorites:', error);
    return NextResponse.json({ error: 'Failed to fetch favorite songs' }, { status: 500 });
  }
  const songs = data?.map((fav: unknown) => (fav as { song: Song }).song) || [];
  return NextResponse.json(songs);
}
