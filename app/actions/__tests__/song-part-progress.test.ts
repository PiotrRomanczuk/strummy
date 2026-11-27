import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { createClient } from '@/lib/supabase/server';

import { markSongPartTempo } from '../song-part-progress';

jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/getUserWithRolesSSR', () => ({ getUserWithRolesSSR: jest.fn() }));

const STUDENT = '11111111-1111-4111-8111-111111111111';
const SONG = '22222222-2222-4222-8222-222222222222';
const LESSON = '33333333-3333-4333-8333-333333333333';
const valid = { studentId: STUDENT, songId: SONG, partLabel: 'A', tempoPercent: 80 };

const insert = jest.fn();

beforeEach(() => {
  insert.mockReset().mockResolvedValue({ error: null });
  (createClient as jest.Mock).mockResolvedValue({ from: () => ({ insert }) });
  (getUserWithRolesSSR as jest.Mock).mockResolvedValue({
    isAdmin: false,
    isTeacher: true,
    profileId: 'teacher-profile',
  });
});

describe('markSongPartTempo', () => {
  it.each([
    ['a tempo of 0', { ...valid, tempoPercent: 0 }],
    ['a tempo above 200', { ...valid, tempoPercent: 201 }],
    ['a fractional tempo', { ...valid, tempoPercent: 99.5 }],
    ['an empty label', { ...valid, partLabel: '' }],
    ['a label over 16 characters', { ...valid, partLabel: 'x'.repeat(17) }],
    ['a missing label', { studentId: STUDENT, songId: SONG, tempoPercent: 80 }],
    ['a student id that is not a uuid', { ...valid, studentId: 'nope' }],
    ['not an object', 'hello'],
  ])('rejects %s without touching the database', async (_name, input) => {
    expect(await markSongPartTempo(input)).toEqual({ error: 'invalid' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('rejects a student and a signed-out caller', async () => {
    (getUserWithRolesSSR as jest.Mock).mockResolvedValue({
      isAdmin: false,
      isTeacher: false,
      profileId: 'student-profile',
    });
    expect(await markSongPartTempo(valid)).toEqual({ error: 'forbidden' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('inserts a new row marked by the caller', async () => {
    expect(await markSongPartTempo({ ...valid, lessonId: LESSON })).toEqual({ success: true });
    expect(insert).toHaveBeenCalledWith({
      student_id: STUDENT,
      song_id: SONG,
      part_label: 'A',
      tempo_percent: 80,
      lesson_id: LESSON,
      marked_by: 'teacher-profile',
    });
  });

  it('marks the whole song with a null label and no lesson', async () => {
    await markSongPartTempo({ ...valid, partLabel: null });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ part_label: null, lesson_id: null })
    );
  });

  it('reports a database refusal (RLS) as failed', async () => {
    insert.mockResolvedValue({ error: { message: 'new row violates row-level security policy' } });
    expect(await markSongPartTempo(valid)).toEqual({ error: 'failed' });
  });
});
