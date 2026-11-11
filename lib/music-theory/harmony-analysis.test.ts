import { analyzeHarmony } from './harmony-analysis';
import { extractChordSequence } from './chord-sequence';
import { detectKey } from './key-detection';
import { parseChordsColumn } from './chord-parser';

const analyze = (
  chords: string,
  storedKey: string | null,
  capoFret = 0,
  sheet: string | null = null
) => analyzeHarmony({ chords, lyricsWithChords: sheet, storedKey, capoFret });

const byChord = (result: ReturnType<typeof analyze>, chord: string) =>
  result?.degrees.find((degree) => degree.chord === chord);

describe('extractChordSequence', () => {
  it('reads inline markers and skips section labels', () => {
    const sheet = '[Chorus]\n[Bm]We [D]are [F#m]up [E]all night\n[Break]';
    expect(extractChordSequence(sheet).map((c) => c.raw)).toEqual(['Bm', 'D', 'F#m', 'E']);
  });

  it('reads chord lines above lyrics and ignores the lyrics', () => {
    const sheet =
      '[Verse 1]\r\nG                     Em\r\nYour heart is like a fortress\r\nB  A  x2\r\n';
    expect(extractChordSequence(sheet).map((c) => c.raw)).toEqual(['G', 'Em', 'B', 'A']);
  });

  it('collapses a chord repeated back to back', () => {
    expect(extractChordSequence('[G]a [G]b [C]c [G]d').map((c) => c.raw)).toEqual(['G', 'C', 'G']);
  });

  it('returns nothing for an empty sheet', () => {
    expect(extractChordSequence(null)).toEqual([]);
  });
});

describe('detectKey', () => {
  it('finds the key of a plain progression', () => {
    expect(detectKey(parseChordsColumn('G, D, Em, C'))?.key).toBe('G');
  });

  it('treats a major V as part of a minor key', () => {
    expect(detectKey(parseChordsColumn('Am, E, Am, Dm, E, Am'))?.key).toBe('Am');
  });

  it('returns null without chords', () => {
    expect(detectKey([])).toBeNull();
  });
});

describe('analyzeHarmony key', () => {
  it('keeps a stored key that fits the chords', () => {
    expect(analyze('Dm, A, G, Bm', 'Dm')).toMatchObject({ key: 'Dm', isKeyGuess: false });
  });

  it('reads a stored sounding key back to the shapes through the capo', () => {
    expect(analyze('Am, G, F, C', 'A#m', 1)).toMatchObject({ key: 'Am', soundingKey: 'Bbm' });
  });

  it('adds the sounding key when the stored key is the shape key', () => {
    expect(analyze('Em7, G, Dsus4, A7sus4', 'G', 2)).toMatchObject({ key: 'G', soundingKey: 'A' });
  });

  it('ignores the form default C when the chords disagree', () => {
    expect(analyze('E, A, B, C#m, F#m', 'C')?.key).toBe('E');
  });

  it('returns null when nothing parses', () => {
    expect(analyze('', 'C')).toBeNull();
  });
});

describe('analyzeHarmony degrees', () => {
  it('numbers diatonic chords', () => {
    const result = analyze('C, Am, F, G', 'C');
    expect(result?.degrees.map((d) => d.numeral)).toEqual(['I', 'vi', 'IV', 'V']);
    expect(result?.degrees.every((d) => d.isDiatonic)).toBe(true);
  });

  it('spells the borrowed flat seventh and names it', () => {
    const f = byChord(analyze('D, Cadd9, G, F, C', 'G'), 'F');
    expect(f).toMatchObject({ numeral: 'bVII', outsideKind: 'borrowed' });
  });

  it('recognises the major V of a minor key', () => {
    expect(byChord(analyze('Bm, F#, A, E, G, D, Em', 'Bm'), 'F#')?.outsideKind).toBe(
      'minorDominant'
    );
  });

  it('names a secondary dominant and its target', () => {
    const e = byChord(analyze('C, E, Am, F, G', 'C'), 'E');
    expect(e).toMatchObject({ outsideKind: 'secondaryDominant', target: 'VI' });
  });
});

describe('analyzeHarmony progressions', () => {
  const sheet = '[C]one [G]two [Am]three [F]four [C]five [G]six [Am]seven [F]eight';

  it('finds an archetype from the playing order', () => {
    expect(analyze('C, G, Am, F', 'C', 0, sheet)?.archetypes.map((a) => a.name)).toContain('Pop');
  });

  it('claims no progression from a bare chord list', () => {
    expect(analyze('C, G, Am, F', 'C')?.archetypes).toEqual([]);
  });
});
