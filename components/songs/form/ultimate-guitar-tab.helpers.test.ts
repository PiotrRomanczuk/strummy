import { parseUltimateGuitarPaste } from './ultimate-guitar.helpers';
import { isTabPage, isTabStaffLine } from './ultimate-guitar-tab.helpers';

/** Synthetic UG "tabs" page: same chrome as a real one, invented riff. */
const TAB_PAGE = `Night Drive Tab by The Placeholders
12,345 views, added to favorites 678 times
Difficulty:Novice
Tuning:E A D G B E
Key:Em
Capo:no capo
Author someone [a] 12.
Night Drive
The Placeholders

[Intro]
e|-----------------|
B|-----------------|
G|-----------------|
D|-----2---2-------|
A|---2---2---------|
E|-0---------3-2-0-|

[Main Riff]
e|-----------------|
B|-----------------|
G|-------4h5-4-----|
D|-----2-------2---|
A|---2-------------|
E|-0---------------|`;

/** A tabs page that also lists the chords it uses. */
const TAB_WITH_CHORDS = `Harbour Lights Tab by Invented Band
Difficulty:Intermediate
Capo:2nd fret
Chords
Am
G
F
[Riff]
Am          G
e|-------0-----|
B|-----1---1---|
G|---2-------2-|
D|-2-----------|
A|-------------|
E|-------------|`;

describe('UG tabs pages', () => {
  it('recognises a tab staff line, including hammer-ons and dropped tunings', () => {
    expect(isTabStaffLine('e|-----0---|')).toBe(true);
    expect(isTabStaffLine('G|-------4h5-4-----|')).toBe(true);
    expect(isTabStaffLine('D#|--3--3----|')).toBe(true);
    expect(isTabStaffLine('C           Em  Am')).toBe(false);
    expect(isTabStaffLine('A - Em')).toBe(false);
  });

  it('puts the tablature in tabNotation, not in lyrics', () => {
    const draft = parseUltimateGuitarPaste(TAB_PAGE);
    expect(draft.pageType).toBe('tab');
    expect(draft.lyricsWithChords).toBeUndefined();
    expect(draft.tabNotation?.startsWith('[Intro]')).toBe(true);
    expect(draft.tabNotation).toContain('[Main Riff]');
    expect(draft.tabNotation).toContain('G|-------4h5-4-----|');
  });

  it('still reads the page metadata: title, level, explicit key, capo', () => {
    const draft = parseUltimateGuitarPaste(TAB_PAGE);
    expect(draft).toMatchObject({
      title: 'Night Drive',
      author: 'The Placeholders',
      level: 'beginner',
      key: 'Em',
      capoFret: 0,
    });
    expect(draft.chords).toEqual([]);
  });

  it('keeps the chords a tabs page lists, so the teacher can judge them', () => {
    const draft = parseUltimateGuitarPaste(TAB_WITH_CHORDS);
    expect(draft.pageType).toBe('tab');
    expect(draft.chords).toEqual(['Am', 'G', 'F']);
    expect(draft.capoFret).toBe(2);
    expect(draft.tabNotation).toContain('E|-------------|');
  });

  it('treats a header-less paste with many staff lines as a tab', () => {
    const bare = TAB_PAGE.split('\n').slice(10).join('\n');
    expect(isTabPage(bare.split('\n'))).toBe(true);
    expect(parseUltimateGuitarPaste(bare).pageType).toBe('tab');
  });

  it('prefers an explicit "Key:" line over the opening chord on chord pages too', () => {
    const page = `Some Song Chords by Someone\nKey:G\n[Verse]\nEm   C   G   D\n  la la la`;
    expect(parseUltimateGuitarPaste(page).key).toBe('G');
  });
});
