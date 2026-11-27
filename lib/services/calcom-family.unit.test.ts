/**
 * The Cal.com webhook's e-mail address is untrusted input used with the service
 * role. It must reach the database as a value: an address carrying PostgREST
 * filter syntax (`,` `)`) must not match, or update, another person's profile.
 */
import type { createAdminClient } from '@/lib/supabase/admin';
import { findProfileByEmail, resolveParentProfile } from './calcom-family';
import { resolveStudentId, type IntakeAnswers } from './calcom-intake.helpers';

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }));

type Row = Record<string, unknown> & { id: string };

/** In-memory `profiles` with exact `.eq()` matching; `.or()` is not offered. */
function fakeAdmin(rows: Row[]) {
  const from = () => {
    const filters: Array<[string, unknown]> = [];
    let patch: Record<string, unknown> | null = null;
    let inserted: Row | null = null;
    const matches = () => rows.filter((r) => filters.every(([col, val]) => r[col] === val));
    const builder = {
      select: () => builder,
      limit: () => builder,
      eq: (col: string, val: unknown) => {
        filters.push([col, val]);
        return builder;
      },
      update: (values: Record<string, unknown>) => {
        patch = values;
        return builder;
      },
      insert: (values: Record<string, unknown>) => {
        inserted = { ...values, id: `new-${rows.length}` };
        rows.push(inserted);
        return builder;
      },
      maybeSingle: async () => ({ data: matches()[0] ?? null, error: null }),
      single: async () => ({ data: inserted, error: null }),
      then: (resolve: (v: { data: Row[]; error: null }) => void) => {
        if (patch) matches().forEach((r) => Object.assign(r, patch));
        resolve({ data: matches(), error: null });
      },
    };
    return builder;
  };
  return { from } as unknown as ReturnType<typeof createAdminClient>;
}

const VICTIM = 'victim@example.com';
const CRAFTED = `a@b.pl,email.eq.${VICTIM})`;

const adultIntake: IntakeAnswers = {
  isForChild: false,
  childName: null,
  age: null,
  hasOwnInstrument: null,
  skillLevel: null,
};

describe('Cal.com e-mail lookups', () => {
  let rows: Row[];
  beforeEach(() => {
    rows = [{ id: 'victim', email: VICTIM, invite_email: null, is_parent: false }];
  });

  it('finds a profile by its exact address', async () => {
    await expect(findProfileByEmail(fakeAdmin(rows), VICTIM)).resolves.toMatchObject({
      id: 'victim',
    });
  });

  it('an address with `,` and `)` matches no other profile', async () => {
    await expect(findProfileByEmail(fakeAdmin(rows), CRAFTED)).resolves.toBeNull();
  });

  it('booking as a parent with a crafted address does not mark someone else as parent', async () => {
    const id = await resolveParentProfile(fakeAdmin(rows), CRAFTED, 'Ktoś', undefined);

    expect(id).not.toBe('victim');
    expect(rows.find((r) => r.id === 'victim')?.is_parent).toBe(false);
    expect(rows.find((r) => r.id === id)?.invite_email).toBe(CRAFTED);
  });

  it('booking for oneself with a crafted address creates a new student, not the existing one', async () => {
    const attendee = { name: 'Ktoś', email: CRAFTED };
    const id = await resolveStudentId(fakeAdmin(rows), attendee, CRAFTED, adultIntake);

    expect(id).not.toBe('victim');
  });
});
