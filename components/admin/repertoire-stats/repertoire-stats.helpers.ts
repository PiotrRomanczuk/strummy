import { NOTE_NAMINGS, type NoteNaming } from '@/lib/music-theory/note-naming';
import { MAX_ARRANGEMENT_SONGS } from '@/lib/repertoire-stats/arrangement';
import { MISMATCH_FIELDS, type MismatchField } from '@/lib/repertoire-stats/mismatches';
import {
  SONG_SORTS,
  TABLE_PAGE,
  type SongSort,
  type SongTableQuery,
} from '@/lib/repertoire-stats/songs-table';

export const REPERTOIRE_STATS_PATH = '/dashboard/admin/repertoire-stats';
export const VIEWS = [
  'overview',
  'mismatches',
  'songs',
  'context',
  'progressions',
  'arrangement',
] as const;
export const MAX_COMPARE = 3;

export type RepertoireView = (typeof VIEWS)[number];

/** The page state, all of it in the URL so any view can be linked (LIST_TABLE_PATTERN.md). */
export interface StatsParams extends SongTableQuery {
  view: RepertoireView;
  names: NoteNaming;
  /** The song of "Song vs repertoire" and "Progressions". */
  song: string | null;
  compare: string[];
  field: MismatchField | null;
  /** The open row of the progression ranking, as "I V vi IV". */
  progression: string | null;
  allProgressions: boolean;
  arrangement: string[];
}

export type RawStatsParams = Partial<Record<string, string | string[]>>;

const one = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? '';
const ids = (value: string | string[] | undefined, max: number) =>
  one(value).split(',').filter(Boolean).slice(0, max);
const pick = <T extends string>(options: readonly T[], value: string, fallback: T): T =>
  options.find((option) => option === value) ?? fallback;

export function parseStatsParams(raw: RawStatsParams): StatsParams {
  const limit = Number(one(raw.limit));
  return {
    view: pick(VIEWS, one(raw.view), 'overview'),
    names: pick(NOTE_NAMINGS, one(raw.names), 'en'),
    song: one(raw.song) || null,
    compare: ids(raw.compare, MAX_COMPARE),
    field: MISMATCH_FIELDS.find((field) => field === one(raw.field)) ?? null,
    q: one(raw.q),
    category: one(raw.category) || null,
    level: one(raw.level) || null,
    hasMismatches: one(raw.mismatches) === '1',
    sort: pick<SongSort>(SONG_SORTS, one(raw.sort), 'students'),
    isAscending: one(raw.dir) === 'asc',
    limit: Number.isInteger(limit) && limit > TABLE_PAGE ? limit : TABLE_PAGE,
    progression: one(raw.progression) || null,
    allProgressions: one(raw.progressions) === 'all',
    arrangement: ids(raw.arrangement, MAX_ARRANGEMENT_SONGS),
  };
}

/** The query of a state of the page: only values that differ from the default are written. */
function statsQuery(params: StatsParams, changes: Partial<StatsParams> = {}): URLSearchParams {
  const next = { ...params, ...changes };
  const entries: [string, string | null | false][] = [
    ['view', next.view === 'overview' ? null : next.view],
    ['names', next.names === 'en' ? null : next.names],
    ['song', next.song],
    ['compare', next.compare.join(',') || null],
    ['field', next.field],
    ['q', next.q || null],
    ['category', next.category],
    ['level', next.level],
    ['mismatches', next.hasMismatches && '1'],
    ['sort', next.sort === 'students' ? null : next.sort],
    ['dir', next.isAscending && 'asc'],
    ['limit', next.limit > TABLE_PAGE ? String(next.limit) : null],
    ['progression', next.progression],
    ['progressions', next.allProgressions && 'all'],
    ['arrangement', next.arrangement.join(',') || null],
  ];
  return new URLSearchParams(entries.filter((entry): entry is [string, string] => !!entry[1]));
}

/** The one way to build a link to a state of the page. */
export function statsHref(params: StatsParams, changes: Partial<StatsParams> = {}): string {
  const query = statsQuery(params, changes).toString();
  return query ? `${REPERTOIRE_STATS_PATH}?${query}` : REPERTOIRE_STATS_PATH;
}

/** Adds the id to a capped list, or takes it out; a full list drops its oldest id. */
export function toggleId(list: string[], id: string, max: number): string[] {
  if (list.includes(id)) return list.filter((other) => other !== id);
  return [...list, id].slice(-max);
}

export const CSV_PATH = '/api/admin/repertoire-stats/csv';

/** The CSV of the view as it is filtered now; `gap` narrows the overview to one group of missing data. */
export function csvHref(params: StatsParams, gap?: string): string {
  const query = statsQuery(params, { view: params.view });
  query.set('view', params.view);
  if (gap) query.set('gap', gap);
  return `${CSV_PATH}?${query.toString()}`;
}
