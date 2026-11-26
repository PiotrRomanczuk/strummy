import { CreateSongExerciseSchema, SongExerciseRowSchema } from '../SongExerciseSchema';

const SONG = '62a9c235-aed2-4912-a78b-0f079079ac92';
const valid = {
  songId: SONG,
  videoId: 'bO28lB1uwp4',
  partN: 2,
  name: 'Riff – Come Together',
  kind: 'riff',
  tempoPercent: 60,
  source: 'backing',
  note: 'slow, then up',
};

describe('CreateSongExerciseSchema', () => {
  it('accepts a full exercise and turns an empty note into null', () => {
    expect(CreateSongExerciseSchema.parse(valid)).toEqual(valid);
    expect(CreateSongExerciseSchema.parse({ ...valid, note: '  ' }).note).toBeNull();
    expect(
      CreateSongExerciseSchema.parse({ ...valid, note: undefined, videoId: null }).note
    ).toBeNull();
  });

  it('trims the name and rejects an empty or too long one', () => {
    expect(CreateSongExerciseSchema.parse({ ...valid, name: '  Riff ' }).name).toBe('Riff');
    expect(CreateSongExerciseSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false);
    expect(CreateSongExerciseSchema.safeParse({ ...valid, name: 'x'.repeat(81) }).success).toBe(
      false
    );
  });

  it.each([
    ['unknown kind', { kind: 'solo' }],
    ['unknown source', { source: 'youtube' }],
    ['tempo below 40', { tempoPercent: 39 }],
    ['tempo above 100', { tempoPercent: 101 }],
    ['part 0', { partN: 0 }],
    ['fractional part', { partN: 1.5 }],
    ['note over 500', { note: 'x'.repeat(501) }],
    ['bad song id', { songId: 'nope' }],
    ['bad video id', { videoId: 'short' }],
  ])('rejects %s', (_label, change) => {
    expect(CreateSongExerciseSchema.safeParse({ ...valid, ...change }).success).toBe(false);
  });
});

describe('SongExerciseRowSchema', () => {
  const row = {
    id: SONG,
    song_id: SONG,
    part_n: 1,
    name: 'n',
    kind: 'chords',
    tempo_percent: 100,
    source: 'recording',
    note: null,
    created_at: '2026-11-26T10:00:00Z',
  };
  const song = { title: 'Come Together', author: 'The Beatles', deleted_at: null };

  it('reads the embedded song as an object or a one-item array', () => {
    expect(SongExerciseRowSchema.safeParse({ ...row, songs: song }).success).toBe(true);
    expect(SongExerciseRowSchema.safeParse({ ...row, songs: [song] }).success).toBe(true);
    expect(SongExerciseRowSchema.safeParse({ ...row, songs: null }).success).toBe(true);
  });

  it('rejects a row with an unknown kind', () => {
    expect(SongExerciseRowSchema.safeParse({ ...row, kind: 'x', songs: song }).success).toBe(false);
  });
});
