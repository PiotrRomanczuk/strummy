import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * Lower half of the Claude Design student dashboard: the full repertoire (with
 * key, capo and practice time) and a merged activity feed — assignments set,
 * song-stage changes and logged practice, newest first.
 */

export type RepertoireSong = {
  songId: string;
  title: string;
  author: string | null;
  musicalKey: string | null;
  capo: number | null;
  status: string;
  minutes: number;
  lastPracticedAt: string | null;
};

export type HomeActivityKind = 'assignment' | 'mastered' | 'stage' | 'practice';

export type HomeActivity = {
  id: string;
  kind: HomeActivityKind;
  at: string;
  /** Who assigned (assignment rows only). */
  actor: string | null;
  /** Song title, assignment title or minutes logged. */
  object: string;
  /** New song stage (stage rows only). */
  stage: string | null;
};

const one = <T>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

type SongJoin = {
  title: string;
  author: string | null;
  key: string | null;
  capo_fret: number | null;
};

export async function getStudentHomeRepertoire(studentId: string): Promise<RepertoireSong[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('student_repertoire')
    .select(
      'song_id, current_status, total_practice_minutes, last_practiced_at, capo_fret, preferred_key, songs:song_id(title, author, key, capo_fret)'
    )
    .eq('student_id', studentId)
    .order('last_practiced_at', { ascending: false, nullsFirst: false });
  if (error) logger.warn('[student-home] repertoire error', { error: error.message });
  return (data ?? []).flatMap((row) => {
    const song = one(row.songs as SongJoin | SongJoin[] | null);
    // No title ⇒ the song is unreadable under RLS (or gone): skip, don't ghost it.
    if (!song?.title) return [];
    return [
      {
        songId: row.song_id,
        title: song.title,
        author: song.author,
        musicalKey: row.preferred_key ?? song.key,
        capo: row.capo_fret ?? song.capo_fret,
        status: row.current_status,
        minutes: row.total_practice_minutes ?? 0,
        lastPracticedAt: row.last_practiced_at,
      },
    ];
  });
}

export async function getStudentHomeActivity(
  studentId: string,
  limit = 5
): Promise<HomeActivity[]> {
  const supabase = await createClient();
  const [assigned, stages, practice] = await Promise.all([
    supabase
      .from('assignments')
      .select(
        'id, title, created_at, song:songs(title), teacher:profiles!assignments_teacher_id_fkey(full_name)'
      )
      .eq('student_id', studentId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('song_status_history')
      .select('id, new_status, changed_at, songs:song_id(title)')
      .eq('student_id', studentId)
      .order('changed_at', { ascending: false })
      .limit(limit),
    supabase
      .from('practice_sessions')
      .select('id, duration_minutes, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);
  for (const res of [assigned, stages, practice]) {
    if (res.error) logger.warn('[student-home] activity error', { error: res.error.message });
  }

  const rows: HomeActivity[] = [
    ...(assigned.data ?? []).map((r) => ({
      id: `a-${r.id}`,
      kind: 'assignment' as const,
      at: r.created_at,
      actor: one(r.teacher as { full_name: string | null }[] | null)?.full_name ?? null,
      object: one(r.song as { title: string }[] | null)?.title ?? r.title ?? '—',
      stage: null,
    })),
    ...(stages.data ?? []).map((r) => ({
      id: `s-${r.id}`,
      kind: r.new_status === 'mastered' ? ('mastered' as const) : ('stage' as const),
      at: r.changed_at,
      actor: null,
      object: one(r.songs as { title: string }[] | null)?.title ?? '—',
      stage: r.new_status,
    })),
    ...(practice.data ?? []).map((r) => ({
      id: `p-${r.id}`,
      kind: 'practice' as const,
      at: r.created_at,
      actor: null,
      object: String(r.duration_minutes ?? 0),
      stage: null,
    })),
  ];
  return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
