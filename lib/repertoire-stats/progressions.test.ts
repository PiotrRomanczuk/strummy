import { gapsCsv, toCsv } from './csv';
import { collapse, knownPatternsOf, progressionRankingOf } from './progressions';
import { makeSong } from './repertoire-song.fixture';
import { songTableOf } from './songs-table';
import { compareProgressions, sectionsOf } from './song-progressions';

const pop = { roman: ['I', 'V', 'vi', 'IV'], chords: ['G', 'D', 'Em', 'C'], bars: 16 };
const blues = { roman: ['I', 'IV', 'V'], chords: ['A', 'D', 'E'], bars: 12 };

describe('progressions of the repertoire', () => {
  const songs = [
    makeSong('a', { analysis: { progressions: [pop, blues] }, students: 1 }),
    makeSong('b', {
      analysis: { progressions: [{ ...pop, chords: ['C', 'G', 'Am', 'F'] }] },
      students: 4,
    }),
    makeSong('c', { analysis: null }),
  ];

  it('merges repeated chords', () => {
    expect(collapse(['I', 'I', 'V', 'V', 'I'])).toEqual(['I', 'V', 'I']);
  });

  it('ranks progressions by songs across keys, most students first within each', () => {
    const [first, second] = progressionRankingOf(songs);
    expect(first.roman).toEqual(['I', 'V', 'vi', 'IV']);
    expect(first.songs.map(({ song }) => song.id)).toEqual(['b', 'a']);
    expect(second.songs).toHaveLength(1);
  });

  it('finds the known patterns, in any rotation', () => {
    const counts = Object.fromEntries(knownPatternsOf(songs).map((p) => [p.name, p.songs.length]));
    expect(counts).toMatchObject({ Pop: 2, Axis: 2, Blues: 1 });
  });
});

describe('compareProgressions', () => {
  const tuned = makeSong('lw', {
    song: { key: 'Em', chords: 'G, Am, Em, Bm' },
    analysis: {
      key: 'F#',
      chords: ['F#', 'Abm', 'Ebm', 'Bbm'],
      progressions: [
        { roman: ['I', 'I', 'ii', 'ii'], chords: ['F#', 'F#', 'Abm', 'Abm'], bars: 28 },
        { roman: ['#iv', 'bii'], chords: ['Cm', 'Gm'], bars: 8 },
      ],
    },
  });

  it('matches through the tuning shift, the order from the chord sheet when there is one', () => {
    const rows = compareProgressions(
      tuned,
      '[G]Well she is [Am]walking [Em]through the [Bm]clouds'
    );
    expect(rows[0]).toMatchObject({
      roman: ['I', 'ii'],
      heard: ['F#', 'Abm'],
      status: 'match',
      strummy: ['G', 'Am'],
    });
    expect(rows[1]).toMatchObject({ status: 'recordingOnly', strummy: [] });
  });

  it('without a sheet only the chords can agree, so the order stays uncertain', () => {
    expect(compareProgressions(tuned, null)[0]).toMatchObject({
      status: 'unordered',
      strummy: ['G', 'Am'],
    });
    expect(compareProgressions(tuned, 'Am G\nwell she is walking')[0].status).toBe('reordered');
  });
});

describe('sectionsOf', () => {
  it('gives each section the chords of its bars, repeats merged, with their degrees', () => {
    const sections = sectionsOf(
      [
        { label: 'A', bars: 2, start_s: 1.4, first_bar: 1 },
        { label: 'B', bars: 1, start_s: 6, first_bar: 3 },
      ],
      [
        { bar: 1, chord: 'G' },
        { bar: 2, chord: 'G' },
        { bar: 3, chord: 'D' },
      ],
      [
        { chord: 'G', roman: 'I' },
        { chord: 'D', roman: 'V' },
      ]
    );
    expect(sections).toEqual([
      { label: 'A', bars: 2, startS: 1.4, chords: ['G'], roman: ['I'] },
      { label: 'B', bars: 1, startS: 6, chords: ['D'], roman: ['V'] },
    ]);
    expect(sectionsOf('nope', [], [])).toEqual([]);
  });
});

describe('songs table and CSV', () => {
  const songs = [
    makeSong('w', { students: 2 }),
    makeSong('z', {
      song: { title: 'Zombie', author: 'The Cranberries', category: 'Pop', tempo: 120 },
      analysis: { bpm: 84 },
    }),
  ];
  const query = {
    q: '',
    category: null,
    level: null,
    hasMismatches: false,
    sort: 'students' as const,
    isAscending: false,
    limit: 50,
  };

  it('filters, sorts and pages on the URL state', () => {
    expect(songTableOf(songs, query).rows.map((song) => song.id)).toEqual(['w', 'z']);
    expect(songTableOf(songs, { ...query, q: 'cranb' }).rows.map((song) => song.id)).toEqual(['z']);
    expect(songTableOf(songs, { ...query, hasMismatches: true }).total).toBe(1);
    expect(
      songTableOf(songs, { ...query, sort: 'title', isAscending: true, limit: 1 })
    ).toMatchObject({ total: 2, rows: [{ id: 'w' }] });
  });

  it('writes CSV with quoted cells and one row per missing song', () => {
    expect(
      toCsv(
        ['a', 'b'],
        [
          ['x, y', 'say "hi"'],
          [null, 3],
        ]
      )
    ).toBe('a,b\r\n"x, y","say ""hi"""\r\n,3\r\n');
    const csv = gapsCsv([makeSong('n', { analysis: null, song: { youtube_url: null } })], null);
    expect(csv.split('\r\n')[1]).toBe('n,Wonderwall,Oasis,0,recording,false');
  });
});
