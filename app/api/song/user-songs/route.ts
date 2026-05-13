import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status });
  }
  const supabase = createAdminClient();

  // Get user profile for role-based access
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, is_teacher, is_student')
    .eq('id', auth.user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  let userId = searchParams.get('userId');

  // Role-based access: students can only see their own songs
  if (profile.is_student && !profile.is_admin && !profile.is_teacher) {
    userId = auth.user.id;
  }

  // Pagination and filter params
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const search = searchParams.get('search') || undefined;
  const level = searchParams.get('level') || undefined;
  const key = searchParams.get('key') || undefined;
  const author = searchParams.get('author') || undefined;
  const sortBy = searchParams.get('sortBy') || undefined;
  const sortOrder = searchParams.get('sortOrder') || 'asc';

  // Helper to build filter for songs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applySongFilters(query: any) {
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }
    if (level) {
      query = query.eq('level', level);
    }
    if (key) {
      query = query.eq('key', key);
    }
    if (author) {
      query = query.eq('author', author);
    }
    return query;
  }

  if (userId) {
    // 1. Find lessons where user is student or teacher
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id')
      .or(`student_id.eq.${userId},teacher_id.eq.${userId}`);

    if (lessonsError) {
      return NextResponse.json({ error: 'Error fetching lessons' }, { status: 500 });
    }
    if (!lessons || lessons.length === 0) {
      return NextResponse.json({
        songs: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }
    const lessonIds = lessons.map((lesson: { id: string }) => lesson.id);

    // 2. Get lesson_songs for those lessons
    const { data: lessonSongs, error: lessonSongsError } = await supabase
      .from('lesson_songs')
      .select('song_id, song_status')
      .in('lesson_id', lessonIds);

    if (lessonSongsError) {
      return NextResponse.json({ error: 'Error fetching lesson songs' }, { status: 500 });
    }
    if (!lessonSongs || lessonSongs.length === 0) {
      return NextResponse.json({
        songs: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }
    const songIdToStatus = lessonSongs.reduce(
      (acc: Record<string, string>, ls: { song_id: string; song_status: string | null }) => {
        if (ls.song_status) {
          acc[ls.song_id] = ls.song_status;
        }
        return acc;
      },
      {} as Record<string, string>
    );
    const songIds = lessonSongs.map((ls: { song_id: string }) => ls.song_id);

    // 3. Get songs for those songIds, with filters, pagination, and sorting
    let query = supabase.from('songs').select('*', { count: 'exact' }).in('id', songIds);
    query = applySongFilters(query);
    if (sortBy) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    }
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data: songs, error: songsError, count } = await query;

    if (songsError) {
      return NextResponse.json({ error: 'Error fetching user songs' }, { status: 500 });
    }
    const songsWithStatus = songs.map((song: Record<string, unknown>) => ({
      ...song,
      status: songIdToStatus[(song as { id: string }).id] || null,
    }));

    const totalPages = Math.ceil((count || 0) / limit);
    return NextResponse.json({
      songs: songsWithStatus,
      pagination: { page, limit, total: count || 0, totalPages },
    });
  } else {
    // All songs, with filters, pagination, and sorting
    let query = supabase.from('songs').select('*', { count: 'exact' });
    query = applySongFilters(query);
    if (sortBy) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    }
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data: allSongs, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: 'Error fetching songs' }, { status: 500 });
    }
    const totalPages = Math.ceil((count || 0) / limit);
    return NextResponse.json({
      songs: allSongs,
      pagination: { page, limit, total: count || 0, totalPages },
    });
  }
}
