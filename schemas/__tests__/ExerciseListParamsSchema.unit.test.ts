import { exerciseListHref, parseExerciseListParams } from '../ExerciseListParamsSchema';
import { isPracticeTempo, PRACTICE_TEMPO_MAX, PRACTICE_TEMPO_MIN } from '../PracticeTempoSchema';

const SONG = '62a9c235-aed2-4912-a78b-0f079079ac92';

describe('parseExerciseListParams', () => {
  it('reads kind, song, search and page from the address', () => {
    expect(parseExerciseListParams({ kind: 'riff', song: SONG, q: ' intro ', page: '3' })).toEqual({
      kind: 'riff',
      song: SONG,
      q: 'intro',
      page: 3,
    });
  });

  it('defaults to the first page with no filter', () => {
    expect(parseExerciseListParams({})).toEqual({
      kind: undefined,
      song: undefined,
      q: undefined,
      page: 1,
    });
  });

  it.each([
    ['an unknown kind', { kind: 'solo' }, 'kind'],
    ['a song id that is not a uuid', { song: '1; drop table' }, 'song'],
    ['an empty search', { q: '   ' }, 'q'],
    ['a search longer than a name', { q: 'x'.repeat(81) }, 'q'],
  ])('drops %s instead of failing the page', (_name, params, key) => {
    expect(parseExerciseListParams(params)[key as 'kind' | 'song' | 'q']).toBeUndefined();
  });

  it.each([['0'], ['-2'], ['abc'], ['1.5'], ['99999']])('falls back to page 1 for "%s"', (page) => {
    expect(parseExerciseListParams({ page }).page).toBe(1);
  });

  it('takes the first value of a repeated parameter', () => {
    expect(parseExerciseListParams({ kind: ['chords', 'riff'], page: ['2', '5'] })).toMatchObject({
      kind: 'chords',
      page: 2,
    });
  });
});

describe('exerciseListHref', () => {
  it('keeps the filter and leaves out the first page', () => {
    expect(exerciseListHref({})).toBe('/dashboard/exercises');
    expect(exerciseListHref({ song: SONG, page: 1 })).toBe(`/dashboard/exercises?song=${SONG}`);
    expect(exerciseListHref({ kind: 'strum', q: 'a b', page: 2 })).toBe(
      '/dashboard/exercises?kind=strum&q=a+b&page=2'
    );
  });
});

describe('practice tempo', () => {
  it('is one 40–100 range for exercises, links and progress marks', () => {
    expect([PRACTICE_TEMPO_MIN, PRACTICE_TEMPO_MAX]).toEqual([40, 100]);
    expect(isPracticeTempo(40)).toBe(true);
    expect(isPracticeTempo(100)).toBe(true);
    expect(isPracticeTempo(39)).toBe(false);
    expect(isPracticeTempo(101)).toBe(false);
    expect(isPracticeTempo(62.5)).toBe(false);
    expect(isPracticeTempo(Number.NaN)).toBe(false);
  });
});
