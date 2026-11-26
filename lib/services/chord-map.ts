/**
 * The chord map: given the shapes a student knows, which songs of the catalogue
 * they can play now, and which single new shape opens the most songs. Pure, so
 * the page can recompute it on every "what if I knew F" click.
 */

import type { ChordShape } from '@/lib/music-theory/chord-shape';

export type ChordMapSong = {
  id: string;
  title: string;
  author: string | null;
  shapes: ChordShape[];
};

/** One shape of the catalogue: in how many songs, and how many it would open now. */
export type ChordTile = { shape: ChordShape; songCount: number; gain: number; isKnown: boolean };

/** A shape the student lacks and the songs where it is the only one missing. */
export type NextChord = { shape: ChordShape; songs: ChordMapSong[] };

export type ChordMap = { playable: ChordMapSong[]; next: NextChord[]; tiles: ChordTile[] };

/** A shape used by fewer songs than this gets no tile, unless the student knows it. */
export const MIN_TILE_SONGS = 2;

const byTitle = (a: ChordMapSong, b: ChordMapSong) => a.title.localeCompare(b.title);

function songsByMissingShape(songs: ChordMapSong[], known: ReadonlySet<ChordShape>) {
  const playable: ChordMapSong[] = [];
  const oneAway = new Map<ChordShape, ChordMapSong[]>();
  for (const song of songs) {
    const missing = song.shapes.filter((shape) => !known.has(shape));
    if (missing.length === 0) playable.push(song);
    if (missing.length === 1) oneAway.set(missing[0], [...(oneAway.get(missing[0]) ?? []), song]);
  }
  return { playable, oneAway };
}

function shapeCounts(songs: ChordMapSong[]): Map<ChordShape, number> {
  const counts = new Map<ChordShape, number>();
  for (const song of songs) {
    for (const shape of song.shapes) counts.set(shape, (counts.get(shape) ?? 0) + 1);
  }
  return counts;
}

export function buildChordMap(songs: ChordMapSong[], known: ReadonlySet<ChordShape>): ChordMap {
  const { playable, oneAway } = songsByMissingShape(songs, known);
  const next = [...oneAway.entries()]
    .map(([shape, opened]) => ({ shape, songs: [...opened].sort(byTitle) }))
    .sort((a, b) => b.songs.length - a.songs.length || a.shape.localeCompare(b.shape));
  const tiles = [...shapeCounts(songs).entries()]
    .filter(([shape, songCount]) => songCount >= MIN_TILE_SONGS || known.has(shape))
    .map(([shape, songCount]) => ({
      shape,
      songCount,
      gain: oneAway.get(shape)?.length ?? 0,
      isKnown: known.has(shape),
    }))
    .sort((a, b) => b.songCount - a.songCount || a.shape.localeCompare(b.shape));
  return { playable: [...playable].sort(byTitle), next, tiles };
}
