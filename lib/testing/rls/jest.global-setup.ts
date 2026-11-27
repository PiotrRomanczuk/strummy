import './jest.setup-env';

import { createLogger } from '../../logger';
import { createServiceClient } from './clients';
import { isRlsTestEnvAvailable, readRlsEnv } from './env';
import { runStartedAt } from '../../../tests/helpers/leak-check';
import { rlsRunId, setRlsRunStartedAt } from './run-marker';
import { sweepRlsData } from './sweep';

const log = createLogger('rls');

/** Leftovers older than this belong to a run that died before its teardown. */
const STALE_AFTER_MS = 2 * 60 * 60 * 1000;

export default async function rlsGlobalSetup(): Promise<void> {
  process.env.RLS_RUN_ID = `run-${Date.now().toString(36)}`;
  if (!isRlsTestEnvAvailable()) {
    // Without credentials every suite turns into describe.skip and Jest exits 0:
    // "99 tests green, nothing executed". Fine on a laptop, a lie in CI.
    if (process.env.RLS_REQUIRED === '1') {
      throw new Error(
        'RLS_REQUIRED=1 but no RLS database credentials were found ' +
          '(RLS_TEST_* or the .env.local Supabase keys). Refusing to skip every suite.'
      );
    }
    return;
  }

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
  // The leak check in jest.global-teardown.ts reports rows created from here on.
  setRlsRunStartedAt(await runStartedAt(readRlsEnv()!.supabaseUrl));
}
