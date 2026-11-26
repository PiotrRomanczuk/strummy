import { deriveSongProgress, type SongProgressMark } from './song-part-progress.helpers';

const mark = (partLabel: string | null, tempoPercent: number, day: number): SongProgressMark => ({
  partLabel,
  tempoPercent,
  markedAt: `2026-11-${String(day).padStart(2, '0')}T10:00:00Z`,
});

describe('deriveSongProgress', () => {
  it('is not_started without marks, with or without parts', () => {
    expect(deriveSongProgress(['A', 'B'], [])).toEqual({ status: 'not_started', parts: [] });
    expect(deriveSongProgress([], [])).toEqual({ status: 'not_started', parts: [] });
  });

  it('is started after the first mark', () => {
    const result = deriveSongProgress(['A', 'B'], [mark('A', 100, 1)]);
    expect(result.status).toBe('started');
    expect(result.parts).toEqual([
      { label: 'A', tempoPercent: 100, markedAt: '2026-11-01T10:00:00Z' },
    ]);
  });

  it('is mastered when every part is at 100% or more', () => {
    const result = deriveSongProgress(['A', 'B'], [mark('A', 100, 1), mark('B', 120, 2)]);
    expect(result.status).toBe('mastered');
    expect(result.parts.map((p) => p.label)).toEqual(['A', 'B']);
  });

  it('is started while one part is below 100% or unmarked', () => {
    expect(deriveSongProgress(['A', 'B'], [mark('A', 100, 1), mark('B', 99, 2)]).status).toBe(
      'started'
    );
    expect(deriveSongProgress(['A', 'B'], [mark('A', 100, 1)]).status).toBe('started');
  });

  it('lets the latest mark win, so a later lower tempo un-masters a part', () => {
    const marks = [mark('A', 100, 1), mark('B', 100, 1), mark('A', 70, 5)];
    const result = deriveSongProgress(['A', 'B'], marks);
    expect(result.status).toBe('started');
    expect(result.parts.find((p) => p.label === 'A')?.tempoPercent).toBe(70);
  });

  it('lets a later higher tempo master a part regardless of the order of the rows', () => {
    const marks = [mark('A', 100, 5), mark('A', 60, 1)];
    expect(deriveSongProgress(['A'], marks).status).toBe('mastered');
  });

  it('counts repeats of a part once, because they share a label', () => {
    const result = deriveSongProgress(
      ['A', 'B', 'A', 'B', 'A'],
      [mark('A', 100, 1), mark('B', 100, 1)]
    );
    expect(result.status).toBe('mastered');
    expect(result.parts).toHaveLength(2);
  });

  it('ignores marks of labels the song does not have', () => {
    const result = deriveSongProgress(['A'], [mark('A', 100, 1), mark('Z', 10, 2)]);
    expect(result.status).toBe('mastered');
    expect(result.parts.map((p) => p.label)).toEqual(['A']);
  });

  it('is started when the only marks are for unknown labels', () => {
    expect(deriveSongProgress(['A'], [mark('Z', 100, 1)])).toEqual({
      status: 'started',
      parts: [],
    });
  });

  it('judges a song without parts by its latest whole-song mark', () => {
    expect(deriveSongProgress([], [mark(null, 80, 1)]).status).toBe('started');
    expect(deriveSongProgress([], [mark(null, 80, 1), mark(null, 100, 2)]).status).toBe('mastered');
    expect(deriveSongProgress([], [mark(null, 100, 1), mark(null, 90, 2)]).status).toBe('started');
  });

  it('only starts a song with parts when the mark is for the whole song', () => {
    expect(deriveSongProgress(['A', 'B'], [mark(null, 100, 1)])).toEqual({
      status: 'started',
      parts: [],
    });
  });

  it('only starts a song without parts when the mark names a part', () => {
    expect(deriveSongProgress([], [mark('A', 100, 1)]).status).toBe('started');
  });
});
