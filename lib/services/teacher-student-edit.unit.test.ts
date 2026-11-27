/**
 * @jest-environment node
 */
import { createClient } from '@/lib/supabase/server';

import { canEditStudent, toTeacherChanges } from './teacher-student-edit';

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));

type Target = { is_student: boolean; is_admin: boolean; is_teacher: boolean } | null;

function mockDb(link: { student_id: string } | null, target: Target) {
  const result = (table: string) => ({ data: table === 'teacher_students' ? link : target });
  const from = jest.fn((table: string) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      limit: () => builder,
      maybeSingle: () => Promise.resolve(result(table)),
    };
    return builder;
  });
  (createClient as jest.Mock).mockResolvedValue({ from });
  return from;
}

const STUDENT = { is_student: true, is_admin: false, is_teacher: false };
const teacher = { profileId: 'teacher-1', isAdmin: false, isTeacher: true };

describe('canEditStudent (#1178)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lets an admin edit anyone without a lookup', async () => {
    const from = mockDb(null, null);
    await expect(
      canEditStudent({ profileId: 'a', isAdmin: true, isTeacher: false }, 's')
    ).resolves.toBe(true);
    expect(from).not.toHaveBeenCalled();
  });

  it('lets a teacher edit a student they teach', async () => {
    mockDb({ student_id: 's' }, STUDENT);
    await expect(canEditStudent(teacher, 's')).resolves.toBe(true);
  });

  it("refuses another teacher's student", async () => {
    mockDb(null, STUDENT);
    await expect(canEditStudent(teacher, 's')).resolves.toBe(false);
  });

  it('refuses a taught profile that is also staff', async () => {
    mockDb({ student_id: 's' }, { ...STUDENT, is_teacher: true });
    await expect(canEditStudent(teacher, 's')).resolves.toBe(false);
  });

  it('refuses a student viewer', async () => {
    const from = mockDb({ student_id: 's' }, STUDENT);
    await expect(
      canEditStudent({ profileId: 's', isAdmin: false, isTeacher: false }, 's')
    ).resolves.toBe(false);
    expect(from).not.toHaveBeenCalled();
  });
});

describe('toTeacherChanges', () => {
  it('maps the card fields and archive to columns and drops empty values', () => {
    expect(
      toTeacherChanges({
        full_name: 'Ana',
        phone: '123',
        skillLevel: 'beginner',
        instrument: '',
        studentStatus: 'archived',
        goals: 'barre chords',
      })
    ).toEqual({
      full_name: 'Ana',
      phone: '123',
      skill_level: 'beginner',
      student_status: 'archived',
      notes: 'barre chords',
    });
  });
});
