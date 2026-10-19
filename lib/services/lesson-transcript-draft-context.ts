import type { SupabaseClient } from '@supabase/supabase-js';

import type { CatalogSong } from './lesson-transcript-draft-matching';

/**
 * Everything the draft agent needs besides the transcript (CNT-8): who is in
 * the lesson (to strip their names), which songs the student already knows
 * (so "a Queen riff" can resolve to the song in their repertoire) and the
 * skills catalog (so skills come back with catalog names).
 */

const KNOWN_SONGS_LIMIT = 60;
const RECENT_LESSONS = 5;

export type DraftLesson = {
  id: string;
  studentId: string;
  teacherId: string;
  scheduledAt: string;
};

export type DraftTranscript = {
  id: string;
  body: string;
  summary: string | null;
  draftStatus: string;
};

export type DraftContext = {
  lesson: DraftLesson;
  transcript: DraftTranscript;
  studentNames: string[];
  teacherNames: string[];
  knownSongs: CatalogSong[];
  skills: { id: string; name: string }[];
};

/**
 * Lessons are spoken, so students are called by diminutives the profile never
 * stores ("Jakub" → "Kuba"). Missing one leaks a name to the model, so the
 * common Polish ones are expanded here; anything rarer comes in as an alias.
 */
const DIMINUTIVES: Record<string, string[]> = {
  jakub: ['Kuba', 'Kubuś'],
  katarzyna: ['Kasia'],
  aleksandra: ['Ola'],
  aleksander: ['Olek'],
  małgorzata: ['Gosia', 'Małgosia'],
  barbara: ['Basia'],
  tomasz: ['Tomek'],
  michał: ['Michaś'],
  magdalena: ['Magda'],
  agnieszka: ['Aga'],
  joanna: ['Asia'],
  krzysztof: ['Krzysiek'],
  zofia: ['Zosia'],
  maria: ['Marysia'],
  wojciech: ['Wojtek'],
  stanisław: ['Staś'],
  antoni: ['Antek'],
  julia: ['Julka'],
  natalia: ['Nata'],
  mateusz: ['Mati'],
};

export function withDiminutives(names: string[]): string[] {
  const expanded = names.flatMap((n) => [n, ...n.split(/\s+/).flatMap((t) => DIMINUTIVES[t.toLowerCase()] ?? [])]);
  return [...new Set(expanded)];
}

type SongRow = { songs: CatalogSong | CatalogSong[] | null };

const songsOf = (rows: SongRow[] | null): CatalogSong[] =>
  (rows ?? []).flatMap((r) => (Array.isArray(r.songs) ? r.songs : r.songs ? [r.songs] : []));

async function loadKnownSongs(supabase: SupabaseClient, lesson: DraftLesson): Promise<CatalogSong[]> {
  const { data: recent } = await supabase
    .from('lessons')
    .select('id')
    .eq('student_id', lesson.studentId)
    .is('deleted_at', null)
    .lte('scheduled_at', lesson.scheduledAt)
    .order('scheduled_at', { ascending: false })
    .limit(RECENT_LESSONS);
  const lessonIds = (recent ?? []).map((l: { id: string }) => l.id);

  const [repertoire, lessonSongs] = await Promise.all([
    supabase
      .from('student_repertoire')
      .select('songs(id, title, author)')
      .eq('student_id', lesson.studentId)
      .eq('is_active', true)
      .limit(KNOWN_SONGS_LIMIT),
    lessonIds.length
      ? supabase.from('lesson_songs').select('songs(id, title, author)').in('lesson_id', lessonIds)
      : Promise.resolve({ data: [] as SongRow[] }),
  ]);

  const byId = new Map<string, CatalogSong>();
  [...songsOf(lessonSongs.data as SongRow[]), ...songsOf(repertoire.data as SongRow[])].forEach((s) =>
    byId.set(s.id, s)
  );
  return [...byId.values()].slice(0, KNOWN_SONGS_LIMIT);
}

async function profileNames(supabase: SupabaseClient, ids: string[]): Promise<Map<string, string[]>> {
  const { data } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
  return new Map(
    (data ?? []).map((p: { id: string; full_name: string | null; email: string | null }) => [
      p.id,
      [p.full_name, p.email?.split('@')[0]?.split(/[.+_]/)[0]].filter((n): n is string => Boolean(n)),
    ])
  );
}

/** Returns null when the lesson or its transcript does not exist / is not visible. */
export async function loadDraftContext(
  supabase: SupabaseClient,
  lessonId: string,
  extraStudentNames: string[] = []
): Promise<DraftContext | null> {
  const [{ data: lesson }, { data: transcript }] = await Promise.all([
    supabase.from('lessons').select('id, student_id, teacher_id, scheduled_at').eq('id', lessonId).maybeSingle(),
    supabase
      .from('lesson_transcripts')
      .select('id, body, summary, draft_status')
      .eq('lesson_id', lessonId)
      .maybeSingle(),
  ]);
  if (!lesson || !transcript) return null;

  const draftLesson: DraftLesson = {
    id: lesson.id,
    studentId: lesson.student_id,
    teacherId: lesson.teacher_id,
    scheduledAt: lesson.scheduled_at,
  };
  const [names, knownSongs, { data: skills }] = await Promise.all([
    profileNames(supabase, [draftLesson.studentId, draftLesson.teacherId]),
    loadKnownSongs(supabase, draftLesson),
    supabase.from('skills').select('id, name').order('name'),
  ]);

  return {
    lesson: draftLesson,
    transcript: {
      id: transcript.id,
      body: transcript.body,
      summary: transcript.summary,
      draftStatus: transcript.draft_status,
    },
    studentNames: withDiminutives([...(names.get(draftLesson.studentId) ?? []), ...extraStudentNames]),
    teacherNames: withDiminutives(names.get(draftLesson.teacherId) ?? []),
    knownSongs,
    skills: (skills ?? []) as { id: string; name: string }[],
  };
}
