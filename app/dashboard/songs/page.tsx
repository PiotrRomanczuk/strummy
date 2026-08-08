import '@/app/design-tokens.css';

import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { redirect } from 'next/navigation';

import { SongsList } from '@/components/songs/SongsList';
import { SONG_LEVELS } from '@/components/shared/level-label.helpers';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getViewerRepertoireSongIds } from '@/lib/services/song-detail-queries';
import {
  getSongsForList,
  type SongListLevel,
  type SongsListFilters,
  type SongsListSort,
} from '@/lib/services/songs-list-queries';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  weight: ['400', '500'],
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['opsz'],
  display: 'swap',
});

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const LEVELS = new Set<SongListLevel>(SONG_LEVELS);
const SORTS = new Set<SongsListSort>([
  'newest',
  'oldest',
  'title',
  'title_desc',
  'author_asc',
  'author_desc',
  'level_asc',
  'level_desc',
  'key_asc',
  'key_desc',
]);

const pickString = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const parseLevel = (value: string | string[] | undefined): SongListLevel | undefined => {
  const raw = pickString(value)?.toLowerCase();
  return raw && LEVELS.has(raw as SongListLevel) ? (raw as SongListLevel) : undefined;
};

const parseSort = (value: string | string[] | undefined): SongsListSort => {
  const raw = pickString(value)?.toLowerCase();
  return raw && SORTS.has(raw as SongsListSort) ? (raw as SongsListSort) : 'newest';
};

const parsePage = (value: string | string[] | undefined): number => {
  const raw = Number(pickString(value));
  return Number.isInteger(raw) && raw > 0 ? raw : 1;
};

export default async function SongsPage({ searchParams }: { searchParams: SearchParams }) {
  const { user, isAdmin, isTeacher, isStudent } = await getUserWithRolesSSR();
  if (!user) {
    redirect('/sign-in?redirect=/dashboard/songs');
  }

  const params = await searchParams;
  const filters: SongsListFilters = {
    level: parseLevel(params.level),
    key: pickString(params.key)?.trim() || undefined,
    author: pickString(params.author)?.trim() || undefined,
    category: pickString(params.category)?.trim() || undefined,
    search: pickString(params.search)?.trim() || undefined,
    sort: parseSort(params.sort),
    page: parsePage(params.page),
    selected: pickString(params.selected)?.trim() || undefined,
  };

  const { songs, total, page, totalPages, breakdown, categories } = await getSongsForList(
    user,
    { isAdmin, isTeacher, isStudent },
    filters
  );

  // One query for the whole page rather than one per row; skipped entirely for
  // staff, who get no per-row pick control.
  const repertoireSongIds = isStudent ? await getViewerRepertoireSongIds() : undefined;

  return (
    <div className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <SongsList
        songs={songs}
        total={total}
        page={page}
        totalPages={totalPages}
        breakdown={breakdown}
        categories={categories}
        canCreate={isTeacher || isAdmin}
        filters={filters}
        canPickToLearn={isStudent}
        repertoireSongIds={repertoireSongIds}
      />
    </div>
  );
}
