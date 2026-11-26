/**
 * chord-map: what a student can play now, and which one new shape opens the
 * most songs. Small hand-made catalogue; the shapes are already parsed.
 */

import { buildChordMap, type ChordMapSong } from './chord-map';

const song = (title: string, shapes: string[]): ChordMapSong => ({
  id: title.toLowerCase().replace(/\s/g, '-'),
  title,
  author: null,
  shapes,
});

const CATALOGUE = [
  song('Knockin', ['G', 'D', 'Am']),
  song('Let It Be', ['C', 'G', 'Am', 'F']),
  song('Zombie', ['Em', 'C', 'G', 'D']),
  song('Riptide', ['Am', 'G', 'C', 'F']),
  song('Wonderwall', ['Em', 'G', 'D', 'A']),
  song('Creep', ['G', 'B', 'C', 'Cm']),
];

describe('buildChordMap', () => {
  it('lists the songs every shape of which is known, by title', () => {
    const map = buildChordMap(CATALOGUE, new Set(['G', 'D', 'Am', 'Em', 'C']));
    expect(map.playable.map((s) => s.title)).toEqual(['Knockin', 'Zombie']);
  });

  it('ranks the shape that opens the most songs first', () => {
    const map = buildChordMap(CATALOGUE, new Set(['G', 'D', 'Am', 'Em', 'C']));
    expect(map.next.map((n) => [n.shape, n.songs.length])).toEqual([
      ['F', 2],
      ['A', 1],
    ]);
    expect(map.next[0].songs.map((s) => s.title)).toEqual(['Let It Be', 'Riptide']);
  });

  it('leaves out songs missing two or more shapes', () => {
    const map = buildChordMap(CATALOGUE, new Set(['G', 'D', 'Am', 'Em', 'C']));
    expect(map.next.flatMap((n) => n.songs).map((s) => s.title)).not.toContain('Creep');
  });

  it('gives a tile to every shape used twice or known, with its gain', () => {
    const map = buildChordMap(CATALOGUE, new Set(['G', 'D', 'Am', 'Em', 'C', 'A']));
    const tiles = Object.fromEntries(map.tiles.map((t) => [t.shape, t]));
    expect(tiles.G).toEqual({ shape: 'G', songCount: 6, gain: 0, isKnown: true });
    expect(tiles.F).toEqual({ shape: 'F', songCount: 2, gain: 2, isKnown: false });
    expect(tiles.A).toEqual({ shape: 'A', songCount: 1, gain: 0, isKnown: true });
    expect(tiles.B).toBeUndefined();
    expect(map.tiles[0].shape).toBe('G');
  });

  it('with nothing known, opens only one-shape songs', () => {
    const map = buildChordMap([...CATALOGUE, song('Drone', ['E'])], new Set());
    expect(map.playable).toEqual([]);
    expect(map.next).toEqual([
      { shape: 'E', songs: [expect.objectContaining({ title: 'Drone' })] },
    ]);
  });
});
