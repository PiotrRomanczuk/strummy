/**
 * getSongCardProgress: only a student from the viewer's roster is honoured, and a lesson only with a student.
 */

import { getStudentOptions } from './lesson-form-data';
import { getSongCardProgress } from './song-card-progress';
import { getSongProgressMarks } from './song-part-progress';

jest.mock('./lesson-form-data', () => ({ getStudentOptions: jest.fn() }));
jest.mock('./song-part-progress', () => ({ getSongProgressMarks: jest.fn() }));

const STUDENT = '11111111-1111-4111-8111-111111111111';
const OTHER = '44444444-4444-4444-8444-444444444444';
const LESSON = '33333333-3333-4333-8333-333333333333';
const viewer = { profileId: 'teacher-1', isAdmin: false };
const MARK = { partLabel: 'A', tempoPercent: 75, markedAt: '2026-11-25T10:00:00Z' };

beforeEach(() => {
  jest.mocked(getStudentOptions).mockResolvedValue([{ id: STUDENT, name: 'Ala', email: null }]);
  jest.mocked(getSongProgressMarks).mockReset().mockResolvedValue([MARK]);
});

describe('getSongCardProgress', () => {
  it('loads the marks of the student in the address and keeps a valid lesson', async () => {
    const result = await getSongCardProgress('song-1', viewer, {
      student: STUDENT,
      lesson: LESSON,
    });
    expect(result).toMatchObject({ studentId: STUDENT, lessonId: LESSON, marks: [MARK] });
    expect(getSongProgressMarks).toHaveBeenCalledWith(STUDENT, 'song-1');
  });

  it('ignores a student outside the roster and then any lesson', async () => {
    const result = await getSongCardProgress('song-1', viewer, { student: OTHER, lesson: LESSON });
    expect(result).toMatchObject({ studentId: null, lessonId: null, marks: [] });
    expect(getSongProgressMarks).not.toHaveBeenCalled();
  });

  it('drops a lesson that is not an id', async () => {
    const result = await getSongCardProgress('song-1', viewer, {
      student: [STUDENT],
      lesson: 'nope',
    });
    expect(result.lessonId).toBeNull();
    expect(result.studentId).toBe(STUDENT);
  });
});
