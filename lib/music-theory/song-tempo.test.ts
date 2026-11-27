/**
 * One tempo, length and date for a song (#1241): the rule the song page, its map and its card share.
 */

import { recordingTempo, resolveSongTempo, resolveSongTiming } from './song-tempo';

describe('resolveSongTempo', () => {
  it('shows the recording at the teacher pulse when the analysis counted double time', () => {
    // "Nothing Else Matters" on dev: counted 142.86, teacher 69.
    const tempo = resolveSongTempo({ recordingBpm: 142.86, feltBpm: null, songBpm: 69 });
    expect(tempo).toMatchObject({ source: 'recording', countedBpm: 142.86, checkAgainst: null });
    expect(tempo?.bpm).toBeCloseTo(71.43);
    expect(tempo?.scale).toBe(0.5);
  });

  it('doubles the recording when the analysis counted half time', () => {
    const tempo = resolveSongTempo({ recordingBpm: 60, feltBpm: null, songBpm: 118 });
    expect(tempo).toMatchObject({ bpm: 120, scale: 2, countedBpm: 60, checkAgainst: null });
  });

  it('keeps the recording when it is close to the teacher tempo', () => {
    // "Hotel California" on dev: 73.17 against 75.
    const tempo = resolveSongTempo({ recordingBpm: 73.17, feltBpm: null, songBpm: 75 });
    expect(tempo).toEqual({
      bpm: 73.17,
      source: 'recording',
      countedBpm: null,
      scale: 1,
      checkAgainst: null,
    });
  });

  it('keeps the recording and asks for a check when they disagree otherwise', () => {
    const tempo = resolveSongTempo({ recordingBpm: 157.9, feltBpm: null, songBpm: 120 });
    expect(tempo).toMatchObject({ bpm: 157.9, scale: 1, countedBpm: null, checkAgainst: 120 });
  });

  it('does not treat a ratio just outside the 8% band as double time', () => {
    const tempo = resolveSongTempo({ recordingBpm: 130.4, feltBpm: null, songBpm: 72 });
    expect(tempo).toMatchObject({ bpm: 130.4, checkAgainst: 72 });
  });

  it('uses the felt tempo of a half-time feel, with or without a teacher tempo', () => {
    expect(resolveSongTempo({ recordingBpm: 160, feltBpm: 80, songBpm: null })).toMatchObject({
      bpm: 80,
      countedBpm: 160,
      scale: 0.5,
    });
    expect(resolveSongTempo({ recordingBpm: 160, feltBpm: 80, songBpm: 160 })).toMatchObject({
      bpm: 160,
      countedBpm: null,
      scale: 1,
    });
  });

  it('uses the recording alone when the song has no tempo', () => {
    expect(resolveSongTempo({ recordingBpm: 142.86, feltBpm: null, songBpm: null })).toMatchObject({
      bpm: 142.86,
      source: 'recording',
      checkAgainst: null,
    });
  });

  it("falls back to the teacher's tempo without a recording, and to null without either", () => {
    expect(resolveSongTempo({ recordingBpm: null, feltBpm: null, songBpm: 69 })).toEqual({
      bpm: 69,
      source: 'song',
      countedBpm: null,
      scale: 1,
      checkAgainst: null,
    });
    expect(resolveSongTempo({ recordingBpm: null, feltBpm: null, songBpm: null })).toBeNull();
    expect(resolveSongTempo({ recordingBpm: 0, feltBpm: null, songBpm: 0 })).toBeNull();
  });

  it('ignores a felt tempo that is not a number', () => {
    expect(recordingTempo({ recordingBpm: 100, feltBpm: 0, songBpm: null }).bpm).toBe(100);
  });
});

describe('resolveSongTiming', () => {
  const recording = {
    bpm: 73.17,
    feltBpm: null,
    durationSeconds: 404.747,
    analysedOn: '2026-11-10',
  };

  it('takes length and date from the analysed recording', () => {
    const timing = resolveSongTiming({ tempo: 75, durationMs: 391000 }, recording);
    expect(timing).toMatchObject({
      durationSeconds: 404.747,
      lengthSource: 'recording',
      analysedOn: '2026-11-10',
    });
    expect(timing.tempo?.bpm).toBe(73.17);
  });

  it('cuts a timestamp to its day', () => {
    const timing = resolveSongTiming(
      { tempo: null, durationMs: null },
      { ...recording, analysedOn: '2026-11-18T22:24:18+00:00' }
    );
    expect(timing.analysedOn).toBe('2026-11-18');
  });

  it("uses the song's own values without a recording", () => {
    expect(resolveSongTiming({ tempo: 75, durationMs: 391000 }, null)).toMatchObject({
      tempo: { bpm: 75, source: 'song' },
      durationSeconds: 391,
      lengthSource: 'song',
      analysedOn: null,
    });
  });

  it("falls back to the song's length when the analysis has none", () => {
    const timing = resolveSongTiming(
      { tempo: 75, durationMs: 391000 },
      { ...recording, durationSeconds: null }
    );
    expect(timing).toMatchObject({ durationSeconds: 391, lengthSource: 'song' });
  });

  it('has no length when neither has one', () => {
    expect(resolveSongTiming({ tempo: null, durationMs: null }, null)).toMatchObject({
      tempo: null,
      durationSeconds: null,
      lengthSource: null,
    });
  });
});
