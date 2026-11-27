/**
 * createSongExercise / deleteSongExercise: staff only, validated, duplicate names reported, errors never thrown.
 */

import { createClient } from '@/lib/supabase/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';

import { createSongExercise, deleteSongExercise } from '../song-exercises';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/getUserWithRolesSSR', () => ({ getUserWithRolesSSR: jest.fn() }));

const SONG = '62a9c235-aed2-4912-a78b-0f079079ac92';
const EXERCISE = '8f1c2d3e-1111-4222-8333-444455556666';
const INPUT = {
  songId: SONG,
  videoId: 'bO28lB1uwp4',
  partN: 3,
  name: 'Riff',
  kind: 'riff',
  tempoPercent: 60,
  source: 'backing',
  note: '',
};

function client(result: { data?: unknown; error: unknown }) {
  const insert = jest.fn();
  const eq = jest.fn().mockResolvedValue({ error: result.error });
  const chain = { select: () => chain, single: () => Promise.resolve(result) };
  insert.mockReturnValue(chain);
  const from = jest.fn(() => ({ insert, delete: () => ({ eq }) }));
  jest.mocked(createClient).mockResolvedValue({ from } as never);
  return { from, insert, eq };
}

const asRole = (role: 'teacher' | 'student') =>
  jest.mocked(getUserWithRolesSSR).mockResolvedValue({
    isAdmin: false,
    isTeacher: role === 'teacher',
  } as never);

describe('createSongExercise', () => {
  it('stores the part with the recording, tempo and source, and returns the new id', async () => {
    asRole('teacher');
    const db = client({ data: { id: EXERCISE }, error: null });
    expect(await createSongExercise(INPUT)).toEqual({ exerciseId: EXERCISE });
    expect(db.from).toHaveBeenCalledWith('song_exercises');
    expect(db.insert).toHaveBeenCalledWith({
      song_id: SONG,
      recording_url: 'https://www.youtube.com/watch?v=bO28lB1uwp4',
      part_n: 3,
      name: 'Riff',
      kind: 'riff',
      tempo_percent: 60,
      source: 'backing',
      note: null,
    });
  });

  it('refuses a student and invalid input without touching the database', async () => {
    const db = client({ data: null, error: null });
    asRole('student');
    expect(await createSongExercise(INPUT)).toEqual({ error: 'forbidden' });
    asRole('teacher');
    expect(await createSongExercise({ ...INPUT, tempoPercent: 10 })).toEqual({ error: 'invalid' });
    expect(await createSongExercise('x')).toEqual({ error: 'invalid' });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('reports a name already used on that part as duplicate, other failures as failed', async () => {
    asRole('teacher');
    client({ data: null, error: { code: '23505', message: 'duplicate key' } });
    expect(await createSongExercise(INPUT)).toEqual({ error: 'duplicate' });
    client({ data: null, error: { code: '42501', message: 'denied' } });
    expect(await createSongExercise(INPUT)).toEqual({ error: 'failed' });
  });
});

describe('deleteSongExercise', () => {
  it('deletes by id for staff', async () => {
    asRole('teacher');
    const db = client({ error: null });
    expect(await deleteSongExercise(EXERCISE)).toEqual({ deleted: true });
    expect(db.eq).toHaveBeenCalledWith('id', EXERCISE);
  });

  it('refuses a student, a bad id, and reports a database failure', async () => {
    const db = client({ error: null });
    asRole('student');
    expect(await deleteSongExercise(EXERCISE)).toEqual({ error: 'forbidden' });
    asRole('teacher');
    expect(await deleteSongExercise('nope')).toEqual({ error: 'invalid' });
    expect(db.eq).not.toHaveBeenCalled();
    client({ error: { message: 'boom' } });
    expect(await deleteSongExercise(EXERCISE)).toEqual({ error: 'failed' });
  });
});
