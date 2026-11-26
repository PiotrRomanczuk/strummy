import { exerciseFromRow } from '../song-exercises';

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));

const ID = '62a9c235-aed2-4912-a78b-0f079079ac92';
const row = (songs: unknown) => ({
  id: ID,
  song_id: ID,
  part_n: 2,
  name: 'Riff',
  kind: 'riff',
  tempo_percent: 75,
  source: 'recording',
  note: 'slowly',
  created_at: '2026-11-26T10:00:00Z',
  songs,
});

describe('exerciseFromRow', () => {
  it('maps a row with its song', () => {
    expect(
      exerciseFromRow(row({ title: 'Come Together', author: 'The Beatles', deleted_at: null }))
    ).toEqual({
      id: ID,
      songId: ID,
      songTitle: 'Come Together',
      songAuthor: 'The Beatles',
      partN: 2,
      name: 'Riff',
      kind: 'riff',
      tempoPercent: 75,
      source: 'recording',
      note: 'slowly',
      createdAt: '2026-11-26T10:00:00Z',
    });
  });

  it('takes the song out of a one-item array', () => {
    const song = { title: 'A', author: null, deleted_at: null };
    expect(exerciseFromRow(row([song]))?.songTitle).toBe('A');
  });

  it('drops an exercise of a deleted song and a row that does not parse', () => {
    expect(exerciseFromRow(row({ title: 'A', author: null, deleted_at: '2026-11-01' }))).toBeNull();
    expect(exerciseFromRow({ id: 1 })).toBeNull();
  });
});
