/**
 * Pure mapping + planning for the @JustMeAndGuitars song catalogue import
 * (docs/marketing/tiktok/songs.yaml → public.songs). No I/O — unit-tested in
 * __tests__/scripts/import-jmg-songs.helpers.test.ts.
 */

import {
  normalizeArtist,
  normalizeTitle,
  statusToPriorityBucket,
} from './import-content-plan.parser';
import { ARTIST_CANONICAL, TITLE_CANONICAL } from './import-jmg-songs.data';

export interface JmgSong {
  title: string;
  artist: string;
  genre?: string | null;
  difficulty_stars?: string | null;
  status?: string | null;
}

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type PriorityBucket = 'done' | 'may' | 'june' | 'later' | 'backlog';

export interface ExistingSong {
  id: string;
  title: string;
  author: string | null;
  level: string | null;
  category: string | null;
  priority_bucket: string | null;
  tiktok_short_url: string | null;
  deleted_at: string | null;
}

export interface SongInsert {
  title: string;
  author: string;
  level: DifficultyLevel;
  category: string | null;
  priority_bucket: PriorityBucket;
}

export interface SongPatch {
  level?: DifficultyLevel;
  category?: string;
  priority_bucket?: PriorityBucket;
  tiktok_short_url?: null;
}

export interface SongUpdate {
  id: string;
  title: string;
  author: string | null;
  set: SongPatch;
  reason: 'catalogue-match' | 'placeholder-url';
}

export interface ImportPlan {
  inserts: SongInsert[];
  updates: SongUpdate[];
  unchanged: number;
  yamlDuplicates: string[];
}

/** Lowest index = most committed content-plan bucket. */
const BUCKET_ORDER: PriorityBucket[] = ['done', 'may', 'june', 'later', 'backlog'];
const PLACEHOLDER_TIKTOK = /^https?:\/\/(www\.)?tiktok\.com\/@strummyapp\/video\/\d+\/?$/i;

/** "★★★☆☆" → number of filled stars → Strummy difficulty_level. Throws on garbage. */
export function starsToLevel(stars: string | null | undefined): DifficultyLevel {
  const filled = (stars ?? '').split('★').length - 1;
  if (filled < 1 || filled > 5) throw new Error(`Unmappable difficulty_stars: "${stars}"`);
  if (filled <= 2) return 'beginner';
  return filled === 3 ? 'intermediate' : 'advanced';
}

/** YAML status ("✅ DONE", "📅 MAY", ...) → songs.priority_bucket. Throws on unknown. */
export function statusToBucket(status: string | null | undefined): PriorityBucket {
  const bucket = statusToPriorityBucket(status ?? null);
  if (!bucket || !BUCKET_ORDER.includes(bucket as PriorityBucket)) {
    throw new Error(`Unknown JMG status "${status}" — extend SONG_STATUS_TO_BUCKET explicitly`);
  }
  return bucket as PriorityBucket;
}

export function isPlaceholderTiktokUrl(url: string | null | undefined): boolean {
  return !!url && PLACEHOLDER_TIKTOK.test(url.trim());
}

export function songKey(title: string, author: string | null): string {
  return `${normalizeTitle(title)}|${normalizeArtist(author ?? '')}`;
}

export function toInsert(song: JmgSong): SongInsert {
  const title = song.title.trim();
  const author = song.artist.trim();
  return {
    title: TITLE_CANONICAL[title] ?? title,
    author: ARTIST_CANONICAL[author] ?? author,
    level: starsToLevel(song.difficulty_stars),
    category: song.genre?.trim() || null,
    priority_bucket: statusToBucket(song.status),
  };
}

/** Collapse YAML rows with the same key; keep the most committed bucket. */
export function dedupeCatalogue(songs: JmgSong[]): { rows: SongInsert[]; duplicates: string[] } {
  const byKey = new Map<string, SongInsert>();
  const duplicates: string[] = [];
  for (const row of songs.map(toInsert)) {
    const key = songKey(row.title, row.author);
    const prev = byKey.get(key);
    if (prev) duplicates.push(`${row.title} — ${row.author}`);
    if (
      !prev ||
      BUCKET_ORDER.indexOf(row.priority_bucket) < BUCKET_ORDER.indexOf(prev.priority_bucket)
    ) {
      byKey.set(key, row);
    }
  }
  return { rows: [...byKey.values()], duplicates };
}

/** Existing curated values win for level/category; the content plan owns priority_bucket. */
export function patchFor(row: SongInsert, existing: ExistingSong): SongPatch {
  const set: SongPatch = {};
  if (existing.priority_bucket !== row.priority_bucket) set.priority_bucket = row.priority_bucket;
  if (!existing.level) set.level = row.level;
  if (!existing.category && row.category) set.category = row.category;
  if (isPlaceholderTiktokUrl(existing.tiktok_short_url)) set.tiktok_short_url = null;
  return set;
}

export function planImport(songs: JmgSong[], existing: ExistingSong[]): ImportPlan {
  const { rows, duplicates } = dedupeCatalogue(songs);
  const active = new Map<string, ExistingSong[]>();
  for (const e of existing.filter((s) => !s.deleted_at)) {
    const key = songKey(e.title, e.author);
    active.set(key, [...(active.get(key) ?? []), e]);
  }
  const plan: ImportPlan = { inserts: [], updates: [], unchanged: 0, yamlDuplicates: duplicates };
  const touched = new Set<string>();
  for (const row of rows) {
    const matches = active.get(songKey(row.title, row.author)) ?? [];
    if (matches.length === 0) plan.inserts.push(row);
    for (const m of matches) {
      touched.add(m.id);
      const set = patchFor(row, m);
      if (Object.keys(set).length === 0) plan.unchanged++;
      else
        plan.updates.push({
          id: m.id,
          title: m.title,
          author: m.author,
          set,
          reason: 'catalogue-match',
        });
    }
  }
  for (const e of existing) {
    if (touched.has(e.id) || !isPlaceholderTiktokUrl(e.tiktok_short_url)) continue;
    plan.updates.push({
      id: e.id,
      title: e.title,
      author: e.author,
      set: { tiktok_short_url: null },
      reason: 'placeholder-url',
    });
  }
  return plan;
}
