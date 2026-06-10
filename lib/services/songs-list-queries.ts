import { createAdminClient } from '@/lib/supabase/admin';
import { getSongsHandler, type SongQueryParams } from '@/app/api/song/handlers';
import type { Song } from '@/components/songs/types';

export type SongListLevel = 'beginner' | 'intermediate' | 'advanced';

export type SongsListFilters = {
  level?: SongListLevel;
  search?: string;
  sort: 'newest' | 'oldest' | 'title';
};

export type SongsListResult = {
  songs: Song[];
  total: number;
  breakdown: Record<SongListLevel | 'unset', number>;
};

const LEVELS: SongListLevel[] = ['beginner', 'intermediate', 'advanced'];

function resolveSort(
  sort: SongsListFilters['sort']
): Pick<SongQueryParams, 'sortBy' | 'sortOrder'> {
  if (sort === 'title') return { sortBy: 'title', sortOrder: 'asc' };
  if (sort === 'oldest') return { sortBy: 'created_at', sortOrder: 'asc' };
  return { sortBy: 'created_at', sortOrder: 'desc' };
}

export async function getSongsForList(
  user: { id: string },
  roles: { isAdmin: boolean; isTeacher: boolean; isStudent: boolean },
  filters: SongsListFilters
): Promise<SongsListResult> {
  const supabase = createAdminClient();
  const profile = { isAdmin: roles.isAdmin, isTeacher: roles.isTeacher };

  const params: SongQueryParams = {
    ...resolveSort(filters.sort),
    level: filters.level,
    search: filters.search?.trim() || undefined,
    page: 1,
    limit: 200,
  };

  const result = await getSongsHandler(supabase, user, profile, params);
  if ('error' in result) {
    return {
      songs: [],
      total: 0,
      breakdown: { beginner: 0, intermediate: 0, advanced: 0, unset: 0 },
    };
  }

  const breakdown: Record<SongListLevel | 'unset', number> = {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
    unset: 0,
  };
  for (const song of result.songs) {
    const lvl = song.level as SongListLevel | null;
    if (lvl && LEVELS.includes(lvl)) breakdown[lvl] += 1;
    else breakdown.unset += 1;
  }

  return {
    songs: result.songs,
    total: result.count ?? result.songs.length,
    breakdown,
  };
}
