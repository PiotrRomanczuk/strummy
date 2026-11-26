/**
 * @jest-environment node
 */
import { getWeeklyInsightsData } from './weekly-insights';

/**
 * The job runs on the admin client, so RLS no longer scopes these reads:
 * each query has to name the teacher (or that teacher's students) itself.
 * The mock records every query and its filters so the tests can assert that.
 */

type Call = { method: string; args: unknown[] };
type Query = { table: string; calls: Call[] };

const TEACHER = 'teacher-1';
const OWN_STUDENTS = ['student-a', 'student-b'];

function mockClient(options: { studentIds: string[] }) {
  const queries: Query[] = [];

  const resultFor = (query: Query) => {
    const select = query.calls.find((c) => c.method === 'select');
    const isCount = (select?.args[1] as { head?: boolean } | undefined)?.head === true;
    if (isCount) return { count: 0, data: null, error: null };
    if (query.table === 'lessons' && String(select?.args[0]).startsWith('student_id, profiles')) {
      return {
        data: options.studentIds.map((id) => ({
          student_id: id,
          profiles: { id, full_name: id, email: `${id}@x.test` },
        })),
        error: null,
      };
    }
    if (query.table === 'profiles')
      return { data: { full_name: 'T', email: 't@x.test' }, error: null };
    return { data: [], error: null };
  };

  const builder = (query: Query): Record<string, unknown> => {
    const self: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'in', 'gte', 'lte', 'lt', 'order', 'limit']) {
      self[method] = (...args: unknown[]) => {
        query.calls.push({ method, args });
        return self;
      };
    }
    self.single = async () => resultFor(query);
    self.then = (resolve: (v: unknown) => void) => resolve(resultFor(query));
    return self;
  };

  const client = {
    from: (table: string) => {
      const query: Query = { table, calls: [] };
      queries.push(query);
      return builder(query);
    },
  };

  return { client: client as unknown as Parameters<typeof getWeeklyInsightsData>[0], queries };
}

const filtersOf = (query: Query) =>
  query.calls.filter((c) => c.method !== 'select').map((c) => [c.method, ...c.args]);

const START = new Date('2026-11-16T00:00:00Z');
const END = new Date('2026-11-22T23:59:59Z');

describe('getWeeklyInsightsData — scoping on the admin client', () => {
  it("limits mastered songs to the teacher's own students", async () => {
    const { client, queries } = mockClient({ studentIds: OWN_STUDENTS });

    await getWeeklyInsightsData(client, TEACHER, START, END);

    const repertoire = queries.filter((q) => q.table === 'student_repertoire');
    expect(repertoire).toHaveLength(1);
    expect(filtersOf(repertoire[0])).toContainEqual(['in', 'student_id', OWN_STUDENTS]);
  });

  it('does not read mastered songs at all when the teacher has no students', async () => {
    const { client, queries } = mockClient({ studentIds: [] });

    const result = await getWeeklyInsightsData(client, TEACHER, START, END);

    expect(queries.some((q) => q.table === 'student_repertoire')).toBe(false);
    expect(result.songsMastered).toEqual([]);
  });

  it('scopes every lessons and assignments query to the teacher or their students', async () => {
    const { client, queries } = mockClient({ studentIds: OWN_STUDENTS });

    await getWeeklyInsightsData(client, TEACHER, START, END);

    const scoped = queries.filter((q) => q.table === 'lessons' || q.table === 'assignments');
    expect(scoped.length).toBeGreaterThan(0);
    for (const query of scoped) {
      const filters = filtersOf(query);
      const byTeacher = filters.some(
        (f) => f[0] === 'eq' && f[1] === 'teacher_id' && f[2] === TEACHER
      );
      const byOwnStudents = filters.some(
        (f) =>
          f[0] === 'in' &&
          f[1] === 'student_id' &&
          JSON.stringify(f[2]) === JSON.stringify(OWN_STUDENTS)
      );
      expect({ table: query.table, scoped: byTeacher || byOwnStudents }).toEqual({
        table: query.table,
        scoped: true,
      });
    }
  });

  it('counts open assignments by real statuses, never the non-existent "pending"', async () => {
    const { client, queries } = mockClient({ studentIds: OWN_STUDENTS });

    await getWeeklyInsightsData(client, TEACHER, START, END);

    const assignments = queries.filter((q) => q.table === 'assignments');
    expect(assignments.length).toBe(2);
    for (const query of assignments) {
      expect(filtersOf(query)).toContainEqual([
        'in',
        'status',
        ['not_started', 'in_progress', 'overdue'],
      ]);
      expect(JSON.stringify(query.calls)).not.toContain('pending');
    }
  });
});
