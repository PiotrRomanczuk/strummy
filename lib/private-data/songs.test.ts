/**
 * @jest-environment node
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { SongEntity } from './private-data.types';
import {
  findEntityByStrummySongId,
  foldQuery,
  getEntity,
  searchSongs,
  songSourceIds,
  strummyIdsOf,
} from './songs';

function song(id: string, artist: string, title: string, sources: Record<string, number>): SongEntity {
  return {
    id,
    artist,
    title,
    search: foldQuery(`${artist} ${title}`).replace(/^the /, ''),
    strummy_song_id: sources['strummy-songs'] ? `strummy-${id}` : null,
    spotify_id: null,
    youtube_id: null,
    sources,
    tabs: sources['gp-songs'] ?? 0,
  };
}

const SONGS = [
  song('e000000000001', 'The Beatles', 'Help!', { 'gp-songs': 1 }),
  song('e000000000002', 'Oasis', 'Wonderwall', { 'gp-songs': 1, 'strummy-songs': 1, 'billboard-hot100': 1 }),
  song('e000000000003', 'Żółta Orkiestra', 'Łąka', { 'spotify-liked': 1 }),
];

describe('searchSongs', () => {
  it('matches every word, without case, diacritics or a leading "the"', () => {
    expect(searchSongs(SONGS, { q: 'the beatles HELP' }).songs.map((s) => s.title)).toEqual(['Help!']);
    expect(searchSongs(SONGS, { q: 'zolta laka' }).total).toBe(1);
    expect(searchSongs(SONGS, { q: 'oasis help' }).total).toBe(0);
  });

  it('keeps only songs found in every chosen source', () => {
    const result = searchSongs(SONGS, { has: ['gp-songs', 'strummy-songs'] });
    expect(result.songs.map((s) => s.title)).toEqual(['Wonderwall']);
  });

  it('puts songs present in more sources first unless sorted by name', () => {
    expect(searchSongs(SONGS, {}).songs[0].title).toBe('Wonderwall');
    expect(searchSongs(SONGS, { sort: 'name' }).songs[0].title).toBe('Wonderwall');
  });

  it('sorts by artist then title itself, whatever order the hub file has', () => {
    const reversed = [...SONGS].reverse();
    const names = (songs: SongEntity[]) => searchSongs(songs, { sort: 'name' }).songs.map((s) => s.title);
    expect(names(reversed)).toEqual(names(SONGS));
    expect(names(reversed)).toEqual(['Wonderwall', 'Help!', 'Łąka']);
  });

  it('lists the filterable sources in the given order', () => {
    expect(songSourceIds(SONGS, ['spotify-liked', 'strummy-songs', 'missing', 'gp-songs'])).toEqual([
      'spotify-liked',
      'strummy-songs',
      'gp-songs',
    ]);
  });
});

describe('hub files', () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'lab-songs-'));
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ version: 1, sources: [], counts: {} }));
    writeFileSync(join(dir, 'songs.jsonl'), SONGS.map((s) => JSON.stringify(s)).join('\n'));
    mkdirSync(join(dir, 'entities', '00'), { recursive: true });
    writeFileSync(
      join(dir, 'entities', '00', 'e000000000002.json'),
      JSON.stringify({ entity: SONGS[1], sections: { 'gp-songs': [{ versions: 9 }] } })
    );
    process.env.PRIVATE_DATA_DIR = dir;
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
    delete process.env.PRIVATE_DATA_DIR;
  });

  it('reads one entity by its id and refuses anything that is not an entity id', () => {
    expect(getEntity('e000000000002')?.sections['gp-songs']).toEqual([{ versions: 9 }]);
    expect(getEntity('e000000000009')).toBeNull();
    expect(getEntity('../manifest')).toBeNull();
    expect(getEntity('E000000000002')).toBeNull();
  });

  it('finds the hub song of a Strummy song', () => {
    expect(findEntityByStrummySongId('strummy-e000000000002')?.title).toBe('Wonderwall');
    expect(findEntityByStrummySongId('unknown')).toBeNull();
  });
});

describe('entities with several Strummy songs', () => {
  const merged: SongEntity = {
    ...song('e000000000004', 'Myslovitz', 'Mieć czy być', { 'strummy-songs': 3 }),
    strummy_song_id: 's1',
    strummy_song_ids: ['s1', 's2'],
  };
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'lab-songs-ids-'));
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ version: 1, sources: [], counts: {} }));
    writeFileSync(join(dir, 'songs.jsonl'), `${JSON.stringify(merged)}\n`);
    process.env.PRIVATE_DATA_DIR = dir;
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
    delete process.env.PRIVATE_DATA_DIR;
  });

  it('finds the entity by any of its Strummy song ids', () => {
    expect(findEntityByStrummySongId('s1')?.id).toBe('e000000000004');
    expect(findEntityByStrummySongId('s2')?.id).toBe('e000000000004');
  });

  it('falls back to the single id of a hub without the list', () => {
    expect(strummyIdsOf(merged)).toEqual(['s1', 's2']);
    expect(strummyIdsOf({ ...merged, strummy_song_ids: undefined })).toEqual(['s1']);
    expect(strummyIdsOf({ ...merged, strummy_song_ids: undefined, strummy_song_id: null })).toEqual([]);
  });
});
