import { isEmptyDraft, parseUltimateGuitarPaste } from './ultimate-guitar.helpers';

/** A synthetic stand-in for a real UG page: same chrome and layout, invented song. */
const PAGE = `Rain On The Rooftop Chords by The Paper Kites
31,729 views, added to favorites 1,415 times
Specifies major and minor chords and places chords agains full lyrics.Was this info helpful?
Difficulty:Intermediate
Tuning:E A D G B E
Capo:No capo
Author somebody [a] 439.
1 contributor total, last edit on Dec 22, 2024
We have an official Rain On The Rooftop tab made by UG professional guitarists.
Chords
Bmadd4
C
Em
Am
F
Am7
Fm
Strumming
EditAre these strumming patterns correct?
1
2
3
4
1
2
3
4
Rain On The Rooftop
The Paper Kites


Where the chord change is on a half measure, the two chords are connected
by a hyphen (with spaces), e.g. C - Em.

Bmadd4 x24430


[Verse 1]
C           Em  Am          F              C
  first invented line of a placeholder verse
            Em    Am         F
  second invented line goes here
C Em Am Am7


[Chorus 1]
F         Fm
  a placeholder chorus line
  C - Em Am - F
  another placeholder chorus line`;

describe('parseUltimateGuitarPaste', () => {
  it('reads the title and artist from the page heading', () => {
    const draft = parseUltimateGuitarPaste(PAGE);

    expect(draft.title).toBe('Rain On The Rooftop');
    expect(draft.author).toBe('The Paper Kites');
  });

  it('strips a (ver N) suffix from the title', () => {
    const draft = parseUltimateGuitarPaste('Wonderwall (ver 3) Chords by Oasis');

    expect(draft.title).toBe('Wonderwall');
    expect(draft.author).toBe('Oasis');
  });

  it.each([
    ['Tab by', 'Rooftops Tab by Band Name', 'Rooftops'],
    ['Ukulele Chords by', 'Rooftops Ukulele Chords by Band Name', 'Rooftops'],
    ['Bass Tab by', 'Rooftops Bass Tab by Band Name', 'Rooftops'],
  ])('recognises the "%s" heading variant', (_label, heading, expected) => {
    expect(parseUltimateGuitarPaste(heading).title).toBe(expected);
  });

  it('maps the UG difficulty onto the app difficulty enum', () => {
    expect(parseUltimateGuitarPaste(PAGE).level).toBe('intermediate');
    expect(parseUltimateGuitarPaste('Difficulty:Novice').level).toBe('beginner');
    expect(parseUltimateGuitarPaste('Difficulty: Advanced').level).toBe('advanced');
  });

  it('leaves the level unset for an unrecognised difficulty', () => {
    expect(parseUltimateGuitarPaste('Difficulty:Whatever').level).toBeUndefined();
  });

  it('reads "No capo" as fret 0 and an ordinal as its number', () => {
    expect(parseUltimateGuitarPaste(PAGE).capoFret).toBe(0);
    expect(parseUltimateGuitarPaste('Capo:2nd fret').capoFret).toBe(2);
    expect(parseUltimateGuitarPaste('Capo: 7').capoFret).toBe(7);
  });

  it('rejects a capo outside the range the form accepts', () => {
    expect(parseUltimateGuitarPaste('Capo:41st fret').capoFret).toBeUndefined();
  });

  it('collects the chord set from the Chords block, deduplicated and in order', () => {
    expect(parseUltimateGuitarPaste(PAGE).chords).toEqual([
      'Bmadd4',
      'C',
      'Em',
      'Am',
      'F',
      'Am7',
      'Fm',
    ]);
  });

  it('stops the chord block at the Strumming heading rather than swallowing it', () => {
    expect(parseUltimateGuitarPaste(PAGE).chords).not.toContain('Strumming');
  });

  it('harvests chords from the tab body when there is no Chords block', () => {
    const bare = ['[Intro]', 'C  Em  Am', 'F  G', '  a placeholder lyric line'].join('\n');

    expect(parseUltimateGuitarPaste(bare).chords).toEqual(['C', 'Em', 'Am', 'F', 'G']);
  });

  it('does not mistake ordinary words for chords when harvesting', () => {
    const bare = ['[Verse]', 'Fajnie Bardzo', 'Em Am'].join('\n');

    expect(parseUltimateGuitarPaste(bare).chords).toEqual(['Em', 'Am']);
  });

  it('takes the key from the chord the tab body opens on', () => {
    // The Chords block lists Bmadd4 first, but the body opens on C.
    expect(parseUltimateGuitarPaste(PAGE).chords[0]).toBe('Bmadd4');
    expect(parseUltimateGuitarPaste(PAGE).key).toBe('C');
  });

  it.each([
    ['Am', 'Am'],
    ['Am7', 'Am'],
    ['Bmadd4', 'Bm'],
    ['Cmaj7', 'C'],
    ['Csus4', 'C'],
    ['Dmin', 'Dm'],
    ['G5', 'G'],
    ['D/F#', 'D'],
  ])('derives the key %s → %s', (chord, expected) => {
    expect(parseUltimateGuitarPaste(`[Intro]\n${chord}`).key).toBe(expected);
  });

  it('respells a flat root as a sharp, since the key dropdown has no flats', () => {
    expect(parseUltimateGuitarPaste('[Intro]\nBb').key).toBe('A#');
    expect(parseUltimateGuitarPaste('[Intro]\nEbm').key).toBe('D#m');
  });

  it('falls back to the chord list when the body has no chord line', () => {
    const noBody = ['Song Chords by Band', 'Chords', 'Em', 'G'].join('\n');

    expect(parseUltimateGuitarPaste(noBody).key).toBe('Em');
  });

  it('leaves the key unset when no chord was found at all', () => {
    expect(parseUltimateGuitarPaste('Difficulty:Novice').key).toBeUndefined();
  });

  it('starts the tab body after the strumming widget, dropping the page chrome', () => {
    const body = parseUltimateGuitarPaste(PAGE).lyricsWithChords ?? '';

    expect(body).not.toContain('views, added to favorites');
    expect(body).not.toContain('UG professional guitarists');
    expect(body).not.toContain('EditAre these strumming');
    expect(body).not.toMatch(/^\d+$/m);
  });

  it.each([
    ['eighth-note counting', ['1', '&', '2', '&', '3', '&', '4', '&']],
    ['sixteenth-note counting', ['1', 'e', '&', 'a', '2', 'e', '&', 'a']],
    ['plus notation', ['1', '+', '2', '+', '3', '+', '4', '+']],
  ])('skips the whole strumming grid when it counts with %s', (_label, grid) => {
    const page = [
      'Some Song Chords by Someone',
      'Strumming',
      'EditAre these strumming patterns correct?',
      ...grid,
      '[Verse 1]',
      'C  G',
    ].join('\n');

    expect(parseUltimateGuitarPaste(page).lyricsWithChords).toBe('[Verse 1]\nC  G');
  });

  it('does not mistake a real short line for a strumming cell', () => {
    const page = ['Strumming', '1', '2', 'Am', '[Verse]', 'C'].join('\n');

    // "Am" is three characters and a real chord — the body must start there.
    expect(parseUltimateGuitarPaste(page).lyricsWithChords).toBe('Am\n[Verse]\nC');
  });

  it('drops the title/artist echo that UG repeats above the tab', () => {
    const body = parseUltimateGuitarPaste(PAGE).lyricsWithChords ?? '';

    expect(body.startsWith('Rain On The Rooftop')).toBe(false);
    expect(body.startsWith('Where the chord change')).toBe(true);
  });

  it('keeps the section headers and chord-over-lyric alignment intact', () => {
    const body = parseUltimateGuitarPaste(PAGE).lyricsWithChords ?? '';

    expect(body).toContain('[Verse 1]');
    expect(body).toContain('[Chorus 1]');
    expect(body).toContain('C           Em  Am          F              C');
  });

  it('collapses runs of blank lines and trims the trailing edge', () => {
    const body = parseUltimateGuitarPaste(PAGE).lyricsWithChords ?? '';

    expect(body).not.toContain('\n\n\n');
    expect(body).toBe(body.trimEnd());
  });

  it('falls back to the first section header when there is no strumming widget', () => {
    const bare = ['Some Song Chords by Someone', 'Difficulty:Novice', '[Intro]', 'C  G'].join('\n');

    expect(parseUltimateGuitarPaste(bare).lyricsWithChords).toBe('[Intro]\nC  G');
  });

  it('treats a bare tab with no page chrome as all body', () => {
    const bare = 'C   G\n  a placeholder lyric line';

    expect(parseUltimateGuitarPaste(bare).lyricsWithChords).toBe(bare);
  });

  it('picks up an Ultimate Guitar URL if the paste contains one', () => {
    const withUrl = `${PAGE}\nhttps://tabs.ultimate-guitar.com/tab/the-paper-kites/rain-27596`;

    expect(parseUltimateGuitarPaste(withUrl).ultimateGuitarLink).toBe(
      'https://tabs.ultimate-guitar.com/tab/the-paper-kites/rain-27596'
    );
  });

  it('leaves the UG link unset when the paste has no URL', () => {
    expect(parseUltimateGuitarPaste(PAGE).ultimateGuitarLink).toBeUndefined();
  });

  it('normalises CRLF line endings', () => {
    const draft = parseUltimateGuitarPaste('[Intro]\r\nC  G\r\n');

    expect(draft.lyricsWithChords).toBe('[Intro]\nC  G');
  });
});

describe('isEmptyDraft', () => {
  it('is true for an empty or whitespace-only paste', () => {
    expect(isEmptyDraft(parseUltimateGuitarPaste(''))).toBe(true);
    expect(isEmptyDraft(parseUltimateGuitarPaste('   \n\n  '))).toBe(true);
  });

  it('is false as soon as anything was recognised', () => {
    expect(isEmptyDraft(parseUltimateGuitarPaste(PAGE))).toBe(false);
    expect(isEmptyDraft(parseUltimateGuitarPaste('Capo:3rd fret'))).toBe(false);
  });
});
