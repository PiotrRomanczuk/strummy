import type { Reporter } from '../lib/reporter';

export async function runCrud(reporter: Reporter, object: string): Promise<void> {
  reporter.section(`CRUD verifier — ${object}`);
  await reporter.step('runner is wired but not yet implemented', async () => {
    throw new Error('CRUD verifier coming in step 3 of the implementation plan');
  });
}
