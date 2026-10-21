import './jest.setup-env';

import { createLogger } from '../../logger';
import { createServiceClient } from './clients';
import { isRlsTestEnvAvailable } from './env';
import { rlsRunId } from './run-marker';
import { sweepRlsData } from './sweep';

const log = createLogger('rls');

/** Leftovers older than this belong to a run that died before its teardown. */
const STALE_AFTER_MS = 2 * 60 * 60 * 1000;

export default async function rlsGlobalSetup(): Promise<void> {
  process.env.RLS_RUN_ID = `run-${Date.now().toString(36)}`;
  if (!isRlsTestEnvAvailable()) return;

  const result = await sweepRlsData(createServiceClient(), {
    olderThan: new Date(Date.now() - STALE_AFTER_MS),
  });
  if (result.users || result.songs) {
    log.warn(
      `${rlsRunId()}: swept stale leftovers of earlier runs: ` +
        `${result.users} users, ${result.songs} songs`
    );
  }
  for (const error of result.errors) log.warn(`stale sweep: ${error}`);
}
