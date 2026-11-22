import { extractIntakeAnswers, resolveStudentId } from '../calcom-intake.helpers';
import { createAdminClient } from '@/lib/supabase/admin';

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

function responsesOf(answers: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(answers).map(([identifier, value]) => [identifier, { value }])
  );
}

describe('extractIntakeAnswers', () => {
  it('returns all-null defaults when no responses are present', () => {
    expect(extractIntakeAnswers(undefined)).toEqual({
      isForChild: false,
      childName: null,
      age: null,
      hasOwnInstrument: null,
      skillLevel: null,
    });
  });

  it('maps the four Gitara-lekcja answers onto intake fields', () => {
    const responses = responsesOf({
      student_or_child: 'Swoje dziecko',
      student_age: 8,
      has_own_instrument: 'Nie',
      guitar_skill_level: 'Zaczynam od zera',
    });

    expect(extractIntakeAnswers(responses)).toEqual({
      isForChild: true,
      childName: null,
      age: 8,
      hasOwnInstrument: false,
      skillLevel: 'beginner',
    });
  });

  it.each([
    ['Zaczynam od zera', 'beginner'],
    ['Podstawowy', 'novice'],
    ['Średniozaawansowany', 'intermediate'],
    ['Zaawansowany', 'advanced'],
  ])('maps skill answer %s to %s', (answer, expected) => {
    const responses = responsesOf({ guitar_skill_level: answer });
    expect(extractIntakeAnswers(responses).skillLevel).toBe(expected);
  });

  it('treats "Siebie" as not-for-child', () => {
    const responses = responsesOf({ student_or_child: 'Siebie' });
    expect(extractIntakeAnswers(responses).isForChild).toBe(false);
  });

  it("reads the child's name when the form asks for it", () => {
    expect(extractIntakeAnswers(responsesOf({ child_name: '  Ola  ' })).childName).toBe('Ola');
    expect(extractIntakeAnswers(responsesOf({ child_name: '   ' })).childName).toBeNull();
  });
});

/**
 * A fake admin client over an in-memory profiles table. Filters are applied for
 * real, so a test states the data and the outcome — not the call sequence.
 */
type Row = Record<string, unknown> & { id: string };
function fakeAdmin(rows: Row[]) {
  const inserted: Row[] = [];
  const updated: Array<{ id: unknown; values: Record<string, unknown> }> = [];
  let nextId = 1;
  const from = () => {
    const filters: Array<[string, unknown]> = [];
    let op: 'select' | 'insert' | 'update' = 'select';
    let values: Record<string, unknown> = {};
    const matches = () => rows.filter((r) => filters.every(([c, v]) => r[c] === v));
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (column: string, value: unknown) => {
        filters.push([column, value]);
        return op === 'update' ? apply() : chain;
      },
      or: () => {
        throw new Error('an interpolated .or() filter must not be used');
      },
      limit: () => chain,
      insert: (v: Record<string, unknown>) => {
        op = 'insert';
        values = v;
        return chain;
      },
      update: (v: Record<string, unknown>) => {
        op = 'update';
        values = v;
        return chain;
      },
      maybeSingle: async () => ({ data: matches()[0] ?? null }),
      single: async () => {
        const row = { id: `new_${nextId++}`, ...values };
        inserted.push(row);
        rows.push(row);
        return { data: { id: row.id }, error: null };
      },
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: matches() }).then(resolve),
    };
    const apply = () => {
      const id = filters.find(([c]) => c === 'id')?.[1];
      updated.push({ id, values });
      rows.filter((r) => r.id === id).forEach((r) => Object.assign(r, values));
      return Promise.resolve({ error: null });
    };
    return chain;
  };
  return { client: { from } as never, inserted, updated };
}

const forChild = (childName: string | null = null) => ({
  isForChild: true,
  childName,
  age: 8,
  hasOwnInstrument: false,
  skillLevel: 'beginner',
});
const jan = { name: 'Jan Kowalski', email: 'jan@example.com', phoneNumber: '+48111222333' };
const parentRow = { id: 'parent_1', email: null, invite_email: 'jan@example.com', is_parent: true };

describe('resolveStudentId — booking for a child', () => {
  beforeEach(() => (createAdminClient as jest.Mock).mockReset());

  it('creates the parent and a placeholder child on a first booking without a name', async () => {
    const db = fakeAdmin([]);
    const id = await resolveStudentId(db.client, jan, 'jan@example.com', forChild());
    expect(db.inserted[0]).toMatchObject({
      full_name: 'Jan Kowalski',
      is_parent: true,
      is_shadow: true,
    });
    expect(db.inserted[1]).toMatchObject({
      id,
      full_name: 'Dziecko Jan Kowalski',
      parent_id: db.inserted[0].id,
      skill_level: 'beginner',
      has_own_instrument: false,
      notes: expect.stringContaining('8'),
    });
  });

  it('creates the child under its own name when the form gives one', async () => {
    const db = fakeAdmin([{ ...parentRow }]);
    await resolveStudentId(db.client, jan, 'jan@example.com', forChild('Ola'));
    expect(db.inserted).toHaveLength(1);
    expect(db.inserted[0]).toMatchObject({ full_name: 'Ola', parent_id: 'parent_1' });
  });

  it('reuses the only child when the booking does not say which', async () => {
    const db = fakeAdmin([
      { ...parentRow },
      { id: 'ola', parent_id: 'parent_1', is_student: true, full_name: 'Ola' },
    ]);
    await expect(resolveStudentId(db.client, jan, 'jan@example.com', forChild())).resolves.toBe(
      'ola'
    );
    expect(db.inserted).toHaveLength(0);
  });

  it('finds the named child among siblings, ignoring case', async () => {
    const db = fakeAdmin([
      { ...parentRow },
      { id: 'ola', parent_id: 'parent_1', is_student: true, full_name: 'Ola' },
      { id: 'kuba', parent_id: 'parent_1', is_student: true, full_name: 'Kuba' },
    ]);
    await expect(
      resolveStudentId(db.client, jan, 'jan@example.com', forChild('kuba'))
    ).resolves.toBe('kuba');
  });

  it("books a sibling as a new child instead of onto the first child's profile", async () => {
    const db = fakeAdmin([
      { ...parentRow },
      { id: 'ola', parent_id: 'parent_1', is_student: true, full_name: 'Ola' },
    ]);
    const id = await resolveStudentId(db.client, jan, 'jan@example.com', forChild('Kuba'));
    expect(id).not.toBe('ola');
    expect(db.inserted[0]).toMatchObject({ full_name: 'Kuba', parent_id: 'parent_1' });
  });

  it('gives the placeholder child its real name instead of creating a duplicate', async () => {
    const db = fakeAdmin([
      { ...parentRow },
      { id: 'kid', parent_id: 'parent_1', is_student: true, full_name: 'Dziecko Jan Kowalski' },
    ]);
    await expect(
      resolveStudentId(db.client, jan, 'jan@example.com', forChild('Ola'))
    ).resolves.toBe('kid');
    expect(db.inserted).toHaveLength(0);
    expect(db.updated).toContainEqual({ id: 'kid', values: { full_name: 'Ola' } });
  });

  it('does not guess between several children when no name is given', async () => {
    const db = fakeAdmin([
      { ...parentRow },
      { id: 'ola', parent_id: 'parent_1', is_student: true, full_name: 'Ola' },
      { id: 'kuba', parent_id: 'parent_1', is_student: true, full_name: 'Kuba' },
    ]);
    const id = await resolveStudentId(db.client, jan, 'jan@example.com', forChild());
    expect(['ola', 'kuba']).not.toContain(id);
    expect(db.inserted[0]).toMatchObject({ full_name: 'Dziecko Jan Kowalski' });
  });

  it('reuses the existing placeholder child instead of creating another one', async () => {
    const db = fakeAdmin([
      { ...parentRow },
      { id: 'ola', parent_id: 'parent_1', is_student: true, full_name: 'Ola' },
      { id: 'kuba', parent_id: 'parent_1', is_student: true, full_name: 'Kuba' },
      { id: 'kid', parent_id: 'parent_1', is_student: true, full_name: 'Dziecko Jan Kowalski' },
    ]);
    await expect(resolveStudentId(db.client, jan, 'jan@example.com', forChild())).resolves.toBe(
      'kid'
    );
    expect(db.inserted).toHaveLength(0);
  });

  it('marks an existing profile with that address as a parent', async () => {
    const db = fakeAdmin([
      { id: 'p', email: 'jan@example.com', invite_email: null, is_parent: false },
    ]);
    await resolveStudentId(db.client, jan, 'jan@example.com', forChild());
    expect(db.updated).toContainEqual({ id: 'p', values: { is_parent: true } });
  });
});

describe('resolveStudentId — booking for oneself', () => {
  const self = {
    isForChild: false,
    childName: null,
    age: 30,
    hasOwnInstrument: true,
    skillLevel: 'advanced',
  };

  it('never overwrites an existing matched profile with booking-form answers', async () => {
    const db = fakeAdmin([{ id: 'existing_1', email: null, invite_email: 'alex@example.com' }]);
    await expect(
      resolveStudentId(
        db.client,
        { name: 'Alex', email: 'alex@example.com' },
        'alex@example.com',
        self
      )
    ).resolves.toBe('existing_1');
    expect(db.updated).toHaveLength(0);
    expect(db.inserted).toHaveLength(0);
  });

  it('matches the address exactly — a comma in it cannot widen the lookup', async () => {
    const db = fakeAdmin([{ id: 'victim', email: 'victim@example.com', invite_email: null }]);
    const tricky = 'x@example.com,email.eq.victim@example.com';
    const id = await resolveStudentId(db.client, { name: 'X', email: tricky }, tricky, self);
    expect(id).not.toBe('victim');
    expect(db.inserted[0]).toMatchObject({ invite_email: tricky, is_student: true });
  });
});
