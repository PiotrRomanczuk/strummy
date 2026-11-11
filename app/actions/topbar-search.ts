'use server';

import { z } from 'zod';

import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { createLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

const log = createLogger('topbar-search');

const RESULT_LIMIT = 5;
const QuerySchema = z.string().trim().min(2).max(100);

export type TopbarSearchResults = {
  songs: { id: string; title: string; author: string | null }[];
  students: { id: string; name: string | null }[];
};

const EMPTY: TopbarSearchResults = { songs: [], students: [] };

/** `%`, `_` and `\` are wildcards to ilike; `,` `(` `)` structure `.or()` filters. */
const toPattern = (query: string) => `%${query.replace(/[\\%_,()]/g, '')}%`;

export async function searchTopbar(input: unknown): Promise<TopbarSearchResults> {
  const parsed = QuerySchema.safeParse(input);
  if (!parsed.success) return EMPTY;

  const { user, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) return EMPTY;

  const pattern = toPattern(parsed.data);
  const supabase = await createClient();

  const songsQuery = supabase
    .from('songs')
    .select('id, title, author')
    .is('deleted_at', null)
    .or(`title.ilike.${pattern},author.ilike.${pattern}`)
    .order('title')
    .limit(RESULT_LIMIT);

  const canSearchStudents = isAdmin || isTeacher;
  const studentsQuery = canSearchStudents
    ? supabase
        .from('profiles')
        .select('id, full_name')
        .eq('is_student', true)
        .is('deleted_at', null)
        .ilike('full_name', pattern)
        .order('full_name')
        .limit(RESULT_LIMIT)
    : null;

  const [songs, students] = await Promise.all([songsQuery, studentsQuery]);
  if (songs.error) log.error('Song search failed', { code: songs.error.code });
  if (students?.error) log.error('Student search failed', { code: students.error.code });

  return {
    songs: songs.data ?? [],
    students: (students?.data ?? []).map(({ id, full_name }) => ({ id, name: full_name })),
  };
}
