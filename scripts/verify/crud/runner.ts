import type { SupabaseClient } from '@supabase/supabase-js';
import { expectAllowed, expectDenied } from '../lib/assert';
import { seedCrudFixtures, type CrudFixtures } from '../lib/fixtures';
import type { Reporter } from '../lib/reporter';
import { signInAs } from '../lib/supabase-clients';
import { LESSONS_MATRIX, type MatrixCell } from './matrix';

const MATRICES: Record<string, MatrixCell[]> = {
  lessons: LESSONS_MATRIX,
};

export async function runCrud(reporter: Reporter, object: string): Promise<void> {
  const targets = object === 'all' ? Object.keys(MATRICES) : [object];
  const unknown = targets.filter((t) => !MATRICES[t]);
  if (unknown.length) {
    reporter.section(`CRUD verifier — ${object}`);
    await reporter.step(`unknown object(s): ${unknown.join(', ')}`, async () => {
      throw new Error(`Available: ${Object.keys(MATRICES).join(', ')} or 'all'`);
    });
    return;
  }

  reporter.section(`CRUD verifier — ${targets.join(', ')}`);
  let fx: CrudFixtures | null = null;

  try {
    await reporter.step(
      'seed fixtures (admin/teacherA/studentA + ephemeral teacherB/studentB + 2 lessons)',
      async () => {
        fx = await seedCrudFixtures();
      }
    );
    if (!fx) return;

    const clients = await signInClients(reporter, fx);
    if (!clients) return;

    for (const target of targets) {
      reporter.section(`  → ${target} (${MATRICES[target].length} cells)`);
      for (const cell of MATRICES[target]) {
        await reporter.step(`[${cell.role}, ${cell.expect}] ${cell.label}`, async () => {
          const client = clients[cell.role];
          const res = await cell.run(client, fx!);
          if (cell.expect === 'allow') expectAllowed(res, cell.label);
          else expectDenied(res, cell.label);
        });
      }
    }
  } finally {
    if (fx) {
      await reporter.step('cleanup (delete ephemeral users + test lessons)', async () => {
        await fx!.cleanup();
      });
    }
  }
}

type RoleClients = Record<
  'admin' | 'teacherA' | 'teacherB' | 'studentA' | 'studentB',
  SupabaseClient
>;

async function signInClients(reporter: Reporter, fx: CrudFixtures): Promise<RoleClients | null> {
  const entries: Array<[keyof RoleClients, { email: string; password: string }]> = [
    ['admin', fx.admin],
    ['teacherA', fx.teacherA],
    ['teacherB', fx.teacherB],
    ['studentA', fx.studentA],
    ['studentB', fx.studentB],
  ];
  const out = {} as RoleClients;
  for (const [role, creds] of entries) {
    const result = await reporter.step(`signInAs ${role} (${creds.email})`, () =>
      signInAs(creds.email, creds.password)
    );
    if (!result) return null;
    out[role] = result;
  }
  return out;
}
