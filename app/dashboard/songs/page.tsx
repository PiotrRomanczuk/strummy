import '@/app/design-preview/editorial-tokens.css';

import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { redirect } from 'next/navigation';

import { SongsListEditorial } from '@/components/songs/editorial/SongsListEditorial';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import {
  getSongsForList,
  type SongListLevel,
  type SongsListFilters,
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

const LEVELS = new Set<SongListLevel>(['beginner', 'intermediate', 'advanced']);
const SORTS = new Set<SongsListFilters['sort']>(['newest', 'oldest', 'title']);

const pickString = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const parseLevel = (value: string | string[] | undefined): SongListLevel | undefined => {
  const raw = pickString(value)?.toLowerCase();
  return raw && LEVELS.has(raw as SongListLevel) ? (raw as SongListLevel) : undefined;
};

const parseSort = (value: string | string[] | undefined): SongsListFilters['sort'] => {
  const raw = pickString(value)?.toLowerCase();
  return raw && SORTS.has(raw as SongsListFilters['sort'])
    ? (raw as SongsListFilters['sort'])
    : 'newest';
};

export default async function SongsPage({ searchParams }: { searchParams: SearchParams }) {
  const { user, isAdmin, isTeacher, isStudent } = await getUserWithRolesSSR();
  if (!user) {
    redirect('/sign-in?redirect=/dashboard/songs');
  }

  const params = await searchParams;
  const filters: SongsListFilters = {
    level: parseLevel(params.level),
    search: pickString(params.search)?.trim() || undefined,
    sort: parseSort(params.sort),
  };

  const { songs, total, breakdown } = await getSongsForList(
    user,
    { isAdmin, isTeacher, isStudent },
    filters
  );

  return (
    <div className={`theme-editorial ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <SongsListEditorial
        songs={songs}
        total={total}
        breakdown={breakdown}
        canCreate={isTeacher || isAdmin}
        filters={filters}
      />
    </div>
  );
}
