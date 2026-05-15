import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface Song {
  id: string;
  title: string;
  author: string;
  level?: string;
  key?: string;
  cover_image_url?: string;
}

interface StatusChange {
  id: string;
  previous_status: string;
  new_status: string;
  changed_at: string;
  notes?: string;
  song: Song;
}

interface SongSummary {
  song: Song;
  totalChanges: number;
  currentStatus: string;
  firstChange: string;
  lastChange: string;
  recentChanges: StatusChange[];
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Check if user is admin/teacher via profiles table boolean flags
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, is_teacher')
      .eq('id', user.id)
      .single();

    const isAdminOrTeacher = profile?.is_admin || profile?.is_teacher;
    const targetStudentId = studentId || user.id;

    // If not admin/teacher, can only see own data
    if (!isAdminOrTeacher && targetStudentId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get comprehensive status history with song details
    const { data, error } = await supabase
      .from('song_status_history')
      .select(
        `
        id,
        previous_status,
        new_status,
        changed_at,
        notes,
        song:songs(
          id,
          title,
          author,
          level,
          key,
          cover_image_url
        )
      `
      )
      .eq('student_id', targetStudentId)
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching status history:', error);
      return NextResponse.json({ error: 'Failed to fetch status history' }, { status: 500 });
    }

    // Group by song for summary view
    const songSummaries = (data as unknown as StatusChange[]).reduce(
      (acc: Record<string, SongSummary>, change: StatusChange) => {
        // Note: Supabase joins return single objects, not arrays for single relationships
        const song = change.song;
        const songId = song?.id;

        if (!songId || !song) return acc;

        if (!acc[songId]) {
          acc[songId] = {
            song: song,
            totalChanges: 0,
            currentStatus: change.new_status,
            firstChange: change.changed_at,
            lastChange: change.changed_at,
            recentChanges: [],
          };
        }

        acc[songId].totalChanges++;
        acc[songId].recentChanges.push(change);

        // Update first/last change dates
        if (change.changed_at > acc[songId].lastChange) {
          acc[songId].currentStatus = change.new_status;
          acc[songId].lastChange = change.changed_at;
        }
        if (change.changed_at < acc[songId].firstChange) {
          acc[songId].firstChange = change.changed_at;
        }

        return acc;
      },
      {}
    );

    return NextResponse.json({
      data,
      summary: Object.values(songSummaries),
      totalChanges: data.length,
    });
  } catch (error) {
    logger.error('Error in status history fetch:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
