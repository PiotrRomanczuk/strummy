import { existsSync, readFileSync, statSync } from 'node:fs';

import { hubPath, isPrivateDataAvailable } from './config';
import type { EntityDocument, SongEntity, SongQuery, SongPage } from './private-data.types';

const ENTITY_ID = /^e[0-9a-f]{12}$/;
const PAGE_SIZE = 50;

interface SongIndex {
  file: string;
  mtimeMs: number;
  songs: SongEntity[];
  byStrummyId: Map<string, SongEntity>;
}

// ~74k rows, ~17 MB: parsed once per hub build and kept across dev-server reloads.
const cache = globalThis as typeof globalThis & { __labSongs?: SongIndex };

export function loadSongIndex(): SongIndex | null {
  if (!isPrivateDataAvailable()) return null;
  const file = hubPath('songs.jsonl');
  if (!existsSync(file)) return null;
  const { mtimeMs } = statSync(file);
  let index = cache.__labSongs;
  if (!index || index.file !== file || index.mtimeMs !== mtimeMs) {
    const songs = readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as SongEntity);
    const byStrummyId = new Map(
      songs.filter((s) => s.strummy_song_id).map((s) => [s.strummy_song_id as string, s])
    );
    index = { file, mtimeMs, songs, byStrummyId };
    cache.__labSongs = index;
  }
  return index;
}

/** Same folding as the hub's `search` field: ASCII lower case, words split on anything else. */
export function foldQuery(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[łŁ]/g, 'l')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Songs present in more sources first: the ones worth looking at when there is no query. */
function bySourceCount(a: SongEntity, b: SongEntity): number {
  return Object.keys(b.sources).length - Object.keys(a.sources).length;
}

export function searchSongs(songs: SongEntity[], query: SongQuery): SongPage {
  // The hub drops a leading "the" from names ("the beatles help" → "beatles help").
  const words = foldQuery(query.q ?? '')
    .split(' ')
    .filter((word) => word && word !== 'the');
  const has = query.has ?? [];
  const matching = songs.filter(
    (song) =>
      words.every((word) => song.search.includes(word)) && has.every((source) => source in song.sources)
  );
  const sorted = query.sort === 'name' ? matching : [...matching].sort(bySourceCount);
  const page = Math.max(query.page ?? 1, 1);
  const start = (page - 1) * PAGE_SIZE;
  return { songs: sorted.slice(start, start + PAGE_SIZE), total: matching.length, page, pageSize: PAGE_SIZE };
}

/** Everything every source holds about one song; null for an id that is not a hub entity id. */
export function getEntity(id: string): EntityDocument | null {
  if (!ENTITY_ID.test(id) || !isPrivateDataAvailable()) return null;
  const file = hubPath('entities', id.slice(1, 3), `${id}.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8')) as EntityDocument;
}

export function findEntityByStrummySongId(songId: string): SongEntity | null {
  return loadSongIndex()?.byStrummyId.get(songId) ?? null;
}

/** The sources songs can be filtered by, in the order the labels map gives (manifest order). */
export function songSourceIds(songs: SongEntity[], order: string[]): string[] {
  const present = new Set<string>();
  for (const song of songs) for (const source of Object.keys(song.sources)) present.add(source);
  return order.filter((id) => present.has(id));
}
