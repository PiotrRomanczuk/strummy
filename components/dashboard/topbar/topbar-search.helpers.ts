import type { TopbarSearchResults } from '@/app/actions/topbar-search';

/** Row in the dropdown: a result, or the jump to the full list page. */
export type SearchItem = { key: string; label: string; detail?: string | null; href: string };

type Translate = (key: string, values?: Record<string, string>) => string;

export function buildSearchItems(
  results: TopbarSearchResults,
  q: string,
  canSearchStudents: boolean,
  t: Translate
) {
  const songs: SearchItem[] = results.songs.map((song) => ({
    key: `song-${song.id}`,
    label: song.title,
    detail: song.author,
    href: `/dashboard/songs/${song.id}`,
  }));
  const students: SearchItem[] = results.students.map((student) => ({
    key: `student-${student.id}`,
    label: student.name ?? t('searchUnnamedStudent'),
    href: `/dashboard/users/${student.id}`,
  }));
  const search = encodeURIComponent(q);
  const lists: SearchItem[] = [
    { key: 'songs', label: t('searchSongs', { q }), href: `/dashboard/songs?search=${search}` },
  ];
  if (canSearchStudents) {
    lists.push({
      key: 'students',
      label: t('searchStudents', { q }),
      href: `/dashboard/users?search=${search}`,
    });
  }
  return { songs, students, lists, all: [...songs, ...students, ...lists] };
}
