import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SongWithLessonsSchema, type SongWithLessons } from '@/schemas/SongSchema';
import { authenticateRequest } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const querySchema = z.object({
  userId: z.string().uuid(),
  level: z.string().optional(),
});

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
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

  const { searchParams } = new URL(request.url);
  let userId = searchParams.get('userId');
  const level = searchParams.get('level');

  // Students can only see their own songs
  if (profile.is_student && !profile.is_admin && !profile.is_teacher) {
    userId = auth.user.id;
  }

  const parseResult = querySchema.safeParse({ userId, level });
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid query params' }, { status: 400 });
  }

  // Fetch assigned songs for student
  const { data, error } = await supabase
    .from('lesson_songs')
    .select('*,songs(*)')
    .eq('student_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map lesson_songs to SongWithStatus
  const mapped: SongWithLessons[] = data.map((ls: { songs: SongWithLessons; status: string }) => ({
    ...ls.songs,
    status: ls.status,
  }));

  // Optionally filter by level
  const filtered = level ? mapped.filter((song) => song.level === level) : mapped;

  // Validate output
  const safe = SongWithLessonsSchema.array().safeParse(filtered);
  if (!safe.success) {
    return NextResponse.json({ error: 'Invalid song data' }, { status: 500 });
  }

  return NextResponse.json(safe.data);
}
