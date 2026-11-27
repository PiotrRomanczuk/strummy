import './jest.setup-env';

import { createLogger } from '../../logger';
import { createServiceClient } from './clients';
import { isRlsTestEnvAvailable } from './env';
import { findLeaks, formatLeaks } from '../../../tests/helpers/leak-check';
import { rlsRunId, rlsRunStartedAt } from './run-marker';
import { sweepRlsData } from './sweep';

const log = createLogger('rls');

/**
 * Deletes whatever this run left behind and FAILS the run if that is
 * impossible: a leak that only prints a warning is how the dev stack reached
 * 5 562 test accounts. A non-zero sweep count is reported but not fatal — it
 * means a suite's own afterAll missed something, which the sweep then fixed.
 * Rows the sweep does not cover (leads, API keys, …) are a leak and fail the run.
 */
export default async function rlsGlobalTeardown(): Promise<void> {
  if (!isRlsTestEnvAvailable()) return;

  const runId = rlsRunId();
  const service = createServiceClient();
  const result = await sweepRlsData(service, { runId });
  if (result.users || result.songs) {
    log.warn(`${runId} left ${result.users} users and ${result.songs} songs behind; swept them`);
  }
  if (result.errors.length > 0) {
    throw new Error(`could not clean up after ${runId}:\n${result.errors.join('\n')}`);
  }

  // The sweep above deletes this run's accounts and fixture songs by its run
  // id. Whatever else the run created has to be deleted by the suite that made
  // it (.claude/rules/playwright-testing.md): a row still here fails the run.
  const since = rlsRunStartedAt();
  if (!since) throw new Error('the run start time was not recorded: the leak check cannot run');
  const leaks = await findLeaks(service, since);
  if (leaks.length > 0) {
    throw new Error(`${runId} left rows behind (created since ${since}):\n${formatLeaks(leaks)}`);
  }
}
