import {
  chordEvents,
  chordonomiconChord,
  chordSheetParts,
  formatSeconds,
  recordFields,
} from './lab-entity.helpers';

describe('lab entity helpers', () => {
  it('formats seconds as m:ss', () => {
    expect(formatSeconds(75.3)).toBe('1:15');
    expect(formatSeconds(0)).toBe('0:00');
  });

  it('reads Chord ID pairs and drops malformed ones', () => {
    expect(chordEvents([[0, 'Em'], [2.5, 'G'], ['x', 'C'], 'D'])).toEqual([
      { at: 0, chord: 'Em' },
      { at: 2.5, chord: 'G' },
    ]);
    expect(chordEvents(null)).toEqual([]);
  });

  it('respells Chordonomicon chords', () => {
    expect(chordonomiconChord('Fsmin')).toBe('F#m');
    expect(chordonomiconChord('Amin7')).toBe('Am7');
    expect(chordonomiconChord('Emaj7')).toBe('Emaj7');
    expect(chordonomiconChord('Fsmin/Cs')).toBe('F#m/C#');
  });

  it('splits a chord sheet into its tagged parts', () => {
    expect(chordSheetParts('<intro_1> G Fs <verse_1> Amin C')).toEqual([
      { part: 'intro 1', chords: ['G', 'F#'] },
      { part: 'verse 1', chords: ['Am', 'C'] },
    ]);
  });

  it('keeps bulky fields out of the readable summary', () => {
    expect(recordFields({ name: 'Wonderwall', chords: [[0, 'Em']], tempo: 87, empty: '' })).toEqual([
      ['name', 'Wonderwall'],
      ['tempo', '87'],
    ]);
  });
});
