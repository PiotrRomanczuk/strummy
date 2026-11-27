import { voicingForChord } from './chord-voicing-lookup';
import { SONG_CHORD_SYMBOLS } from './song-chord-symbols.fixture';

/**
 * Chords songs name that may stay without a diagram: a half-diminished or a
 * flat-five chord is not its triad, and the app has no shape for it yet.
 * Anything else a song names must draw (#1240: F# drew "no chart").
 */
const EXOTIC_WITHOUT_SHAPE = new Set(['D#m7b5', 'Fmaj7b5']);

describe('voicingForChord', () => {
  it.each([
    ['F#', 'F#'],
    ['Gb', 'F#'],
    ['F♯', 'F#'],
    ['fis', 'F#m'],
    ['A#', 'Bb'],
    ['Abm', 'G#m'],
    ['Db', 'C#'],
    ['D#m', 'Ebm'],
    ['B♭m', 'Bbm'],
  ])('draws %s with the %s shape', (symbol, shape) => {
    expect(voicingForChord(symbol)?.name).toBe(shape);
  });

  it('draws F# as the 2nd-fret E-shape barre', () => {
    const voicing = voicingForChord('F#');
    expect(voicing?.frets).toEqual([2, 4, 4, 3, 2, 2]);
    expect(voicing?.barre).toEqual({ fret: 2, fromString: 0, toString: 5 });
  });

  it('keeps a written slash chord, else drops its bass', () => {
    expect(voicingForChord('D/F#')?.name).toBe('D/F#');
    expect(voicingForChord('Am7/G')?.name).toBe('Am7');
  });

  it('folds an extension into the triad a student plays', () => {
    expect(voicingForChord('Em9')?.name).toBe('Em');
    expect(voicingForChord('A7sus4')?.name).toBe('A');
    expect(voicingForChord('CM7')?.name).toBe('Cmaj7');
  });

  it('reads Polish lowercase names as minor, H as B', () => {
    expect(voicingForChord('e')?.name).toBe('Em');
    expect(voicingForChord('h')?.name).toBe('Bm');
    expect(voicingForChord('as')?.name).toBe('G#m');
  });

  it('has no shape for what is not a chord or a half-diminished one', () => {
    expect(voicingForChord('')).toBeUndefined();
    expect(voicingForChord('Chorus')).toBeUndefined();
    expect(voicingForChord('Bm7b5')).toBeUndefined();
  });

  it('draws every chord the songs on dev name, except the listed exotic ones', () => {
    const missing = SONG_CHORD_SYMBOLS.filter(
      (symbol) => !EXOTIC_WITHOUT_SHAPE.has(symbol) && !voicingForChord(symbol)
    );
    expect(missing).toEqual([]);
  });

  it('lists no exotic chord that has a shape after all', () => {
    const drawn = [...EXOTIC_WITHOUT_SHAPE].filter((symbol) => voicingForChord(symbol));
    expect(drawn).toEqual([]);
  });
});
