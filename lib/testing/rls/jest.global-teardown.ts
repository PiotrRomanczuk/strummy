import './jest.setup-env';

import { createLogger } from '../../logger';
import { createServiceClient } from './clients';
import { isRlsTestEnvAvailable } from './env';
import { rlsRunId } from './run-marker';
import { sweepRlsData } from './sweep';

const log = createLogger('rls');

/**
 * Deletes whatever this run left behind and FAILS the run if that is
 * impossible: a leak that only prints a warning is how the dev stack reached
 * 5 562 test accounts. A non-zero sweep count is reported but not fatal — it
 * means a suite's own afterAll missed something, which the sweep then fixed.
 */
export default async function rlsGlobalTeardown(): Promise<void> {
  if (!isRlsTestEnvAvailable()) return;

  const runId = rlsRunId();
  const result = await sweepRlsData(createServiceClient(), { runId });
  if (result.users || result.songs) {
    log.warn(`${runId} left ${result.users} users and ${result.songs} songs behind; swept them`);
  }
  if (result.errors.length > 0) {
    throw new Error(`could not clean up after ${runId}:\n${result.errors.join('\n')}`);
  }
}
