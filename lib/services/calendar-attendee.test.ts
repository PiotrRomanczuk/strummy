import { lessonGuests, resolveLessonStudent } from './calendar-attendee';

const mockCreateShadow = jest.fn();
jest.mock('@/lib/services/import-utils', () => ({
  createShadowStudent: (...args: unknown[]) => mockCreateShadow(...args),
}));

type Row = {
  id: string;
  email?: string | null;
  invite_email?: string | null;
  is_student?: boolean;
  is_parent?: boolean;
  parent_id?: string | null;
  deleted_at?: string | null;
};

/**
 * In-memory `profiles` table with the four filters the module uses. `email`
 * compares case-insensitively, like the citext column.
 */
function fakeAdmin(rows: Row[], failWith?: string) {
  const value = (row: Row, column: string) => (row as Record<string, unknown>)[column] ?? null;
  const same = (column: string, a: unknown, b: unknown) =>
    column === 'email' && typeof a === 'string' && typeof b === 'string'
      ? a.toLowerCase() === b.toLowerCase()
      : a === b;
  return {
    from: jest.fn(() => {
      const filters: Array<(row: Row) => boolean> = [];
      const query = {
        select: () => query,
        in: (column: string, values: unknown[]) => {
          filters.push((row) => values.some((v) => same(column, value(row, column), v)));
          return query;
        },
        eq: (column: string, v: unknown) => {
          filters.push((row) => same(column, value(row, column), v));
          return query;
        },
        is: (column: string, v: unknown) => {
          filters.push((row) => value(row, column) === v);
          return query;
        },
        then: (resolve: (result: unknown) => void) =>
          resolve(
            failWith
              ? { data: null, error: { message: failWith } }
              : {
                  data: rows
                    .filter((row) => filters.every((f) => f(row)))
                    .map((row) => ({
                      id: row.id,
                      is_student: row.is_student ?? false,
                      is_parent: row.is_parent ?? false,
                    })),
                  error: null,
                }
          ),
      };
      return query;
    }),
  } as unknown as Parameters<typeof resolveLessonStudent>[2];
}

const TEACHER = 'teacher@strummy.test';
const teacher = { email: TEACHER, self: true };
const ada = { id: 'ada', email: 'ada@example.com', is_student: true };
const mum = { id: 'mum', email: 'mum@example.com', is_parent: true };
const dad = { id: 'dad', email: 'dad@example.com', is_parent: true };
const childOf = (id: string, parent: string, extra: Partial<Row> = {}): Row => ({
  id,
  email: `${id}@example.com`,
  is_student: true,
  parent_id: parent,
  ...extra,
});

beforeEach(() => {
  mockCreateShadow.mockReset();
  mockCreateShadow.mockResolvedValue({ success: true, profileId: 'new-student' });
});

describe('lessonGuests', () => {
  it('drops the teacher, the calendar owner and rooms, and lists each address once', () => {
    expect(
      lessonGuests(
        [
          teacher,
          { email: 'TEACHER@strummy.test' },
          { email: 'room@resource.calendar.google.com', resource: true },
          { email: 'Ada@Example.com', displayName: '$$$ Ada Lovelace' },
          { email: 'ada@example.com' },
          { displayName: 'no address' },
        ],
        TEACHER
      )
    ).toEqual([{ email: 'ada@example.com', displayName: 'Ada Lovelace' }]);
  });
});

describe('resolveLessonStudent', () => {
  it('picks the attendee who is a student', async () => {
    const admin = fakeAdmin([ada]);
    await expect(
      resolveLessonStudent([teacher, { email: 'ADA@example.com' }], TEACHER, admin)
    ).resolves.toEqual({ ok: true, studentId: 'ada', via: 'student' });
  });

  it('prefers the student when the parent attends too', async () => {
    const admin = fakeAdmin([mum, { ...ada, parent_id: 'mum' }, childOf('bob', 'mum')]);
    await expect(
      resolveLessonStudent([{ email: mum.email }, { email: ada.email }], TEACHER, admin)
    ).resolves.toEqual({ ok: true, studentId: 'ada', via: 'student' });
  });

  it("books a parent's lesson on their only child, never on the parent", async () => {
    const admin = fakeAdmin([mum, childOf('kid', 'mum')]);
    await expect(
      resolveLessonStudent([teacher, { email: mum.email }], TEACHER, admin)
    ).resolves.toEqual({ ok: true, studentId: 'kid', via: 'parent' });
    expect(mockCreateShadow).not.toHaveBeenCalled();
  });

  it('leaves a parent with two children for the teacher', async () => {
    const admin = fakeAdmin([mum, childOf('kid1', 'mum'), childOf('kid2', 'mum')]);
    await expect(resolveLessonStudent([{ email: mum.email }], TEACHER, admin)).resolves.toEqual({
      ok: false,
      reason: 'parent_with_several_children',
    });
  });

  it('counts a shared child once when both parents attend', async () => {
    const admin = fakeAdmin([mum, dad, childOf('kid', 'mum')]);
    await expect(
      resolveLessonStudent([{ email: mum.email }, { email: dad.email }], TEACHER, admin)
    ).resolves.toEqual({ ok: true, studentId: 'kid', via: 'parent' });
  });

  it('ignores a deleted child when counting', async () => {
    const admin = fakeAdmin([
      mum,
      childOf('kid', 'mum'),
      childOf('gone', 'mum', { deleted_at: '2026-10-01T00:00:00Z' }),
    ]);
    await expect(resolveLessonStudent([{ email: mum.email }], TEACHER, admin)).resolves.toEqual({
      ok: true,
      studentId: 'kid',
      via: 'parent',
    });
  });

  it('leaves a parent with no linked child for the teacher', async () => {
    const admin = fakeAdmin([mum]);
    await expect(resolveLessonStudent([{ email: mum.email }], TEACHER, admin)).resolves.toEqual({
      ok: false,
      reason: 'parent_without_child',
    });
  });

  it('leaves two students on one event for the teacher', async () => {
    const admin = fakeAdmin([ada, childOf('bob', 'mum')]);
    await expect(
      resolveLessonStudent([{ email: ada.email }, { email: 'bob@example.com' }], TEACHER, admin)
    ).resolves.toEqual({ ok: false, reason: 'several_students' });
  });

  it('finds a shadow student waiting under invite_email', async () => {
    const admin = fakeAdmin([
      { id: 'shadow', email: null, invite_email: 'eve@example.com', is_student: true },
    ]);
    await expect(
      resolveLessonStudent([{ email: 'eve@example.com' }], TEACHER, admin)
    ).resolves.toEqual({
      ok: true,
      studentId: 'shadow',
      via: 'student',
    });
  });

  it('does not make a staff-only profile the student', async () => {
    const admin = fakeAdmin([{ id: 'other-teacher', email: 'coach@example.com' }]);
    await expect(
      resolveLessonStudent([{ email: 'coach@example.com' }], TEACHER, admin)
    ).resolves.toEqual({
      ok: false,
      reason: 'not_a_student',
    });
  });

  it('creates a shadow student for a single unknown attendee', async () => {
    const admin = fakeAdmin([]);
    await expect(
      resolveLessonStudent(
        [teacher, { email: 'new@example.com', displayName: 'Nina Nowak' }],
        TEACHER,
        admin
      )
    ).resolves.toEqual({ ok: true, studentId: 'new-student', via: 'created' });
    expect(mockCreateShadow).toHaveBeenCalledWith('new@example.com', 'Nina', 'Nowak', admin);
  });

  it('does not invent a student when several unknown people attend', async () => {
    const admin = fakeAdmin([]);
    await expect(
      resolveLessonStudent(
        [{ email: 'parent@example.com' }, { email: 'kid@example.com' }],
        TEACHER,
        admin
      )
    ).resolves.toEqual({ ok: false, reason: 'several_unknown' });
    expect(mockCreateShadow).not.toHaveBeenCalled();
  });

  it('skips an event with only the teacher on it', async () => {
    await expect(resolveLessonStudent([teacher], TEACHER, fakeAdmin([]))).resolves.toEqual({
      ok: false,
      reason: 'no_attendee',
    });
  });

  it('reports a failed lookup instead of creating a duplicate', async () => {
    const result = await resolveLessonStudent(
      [{ email: ada.email }],
      TEACHER,
      fakeAdmin([], 'boom')
    );
    expect(result).toEqual({ ok: false, reason: 'lookup_failed', error: 'boom' });
    expect(mockCreateShadow).not.toHaveBeenCalled();
  });

  it('reports a failed shadow creation', async () => {
    mockCreateShadow.mockResolvedValue({ success: false, error: 'duplicate key' });
    await expect(
      resolveLessonStudent([{ email: 'x@example.com' }], TEACHER, fakeAdmin([]))
    ).resolves.toEqual({
      ok: false,
      reason: 'lookup_failed',
      error: 'duplicate key',
    });
  });
});
