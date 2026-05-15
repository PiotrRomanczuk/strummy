import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: Request, { params }: { params: Promise<{ songId: string }> }) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { songId } = await params;

  try {
    // Get the most recent pending match for this song
    const { data: match, error } = await supabase
      .from('spotify_matches')
      .select('*')
      .eq('song_id', songId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return NextResponse.json({ match: null });
      }
      throw error;
    }

    return NextResponse.json({ match });
  } catch (error) {
    logger.error('Failed to fetch match:', error);
    return NextResponse.json({ error: 'Failed to fetch match data' }, { status: 500 });
  }
}
