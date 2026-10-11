import globalSetup from '../../tests/prod-global-setup';
import { assertNotDeployedRun, DEPLOYED_TARGET_ENV } from '../../tests/helpers/deployed-target';

/**
 * The deployed-target preflight once signed in against .env.local's DEV stack,
 * where the dev.local accounts exist, so it passed and every spec then timed
 * out against strummy.online (2026-10-11 audit). These pin the refusals that
 * replaced it. None of them reaches the network.
 */
const ENV_KEYS = [
  'PLAYWRIGHT_BASE_URL',
  'E2E_SKIP_AUTH_PREFLIGHT',
  'E2E_TARGET_SUPABASE_URL',
  'E2E_TARGET_SUPABASE_ANON_KEY',
  'TEST_TEACHER_EMAIL',
  'TEST_TEACHER_PASSWORD',
  'TEST_STUDENT_EMAIL',
  'TEST_STUDENT_PASSWORD',
  DEPLOYED_TARGET_ENV,
];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  ENV_KEYS.forEach((k) => {
    saved[k] = process.env[k];
    delete process.env[k];
  });
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  ENV_KEYS.forEach((k) => {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  });
  jest.restoreAllMocks();
});

describe('deployed-target preflight', () => {
  it('refuses when the target auth endpoint is not configured', async () => {
    await expect(globalSetup()).rejects.toThrow(/E2E_TARGET_SUPABASE_URL/);
  });

  it('refuses a production app paired with a dev auth endpoint', async () => {
    process.env.E2E_TARGET_SUPABASE_URL = 'http://192.168.1.75:55321';
    process.env.E2E_TARGET_SUPABASE_ANON_KEY = 'anon';
    await expect(globalSetup()).rejects.toThrow(/not a production database/);
  });

  it('rejects the dev.local defaults without calling the target', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    process.env.E2E_TARGET_SUPABASE_URL = 'https://db.strummy.online';
    process.env.E2E_TARGET_SUPABASE_ANON_KEY = 'anon';
    process.env.TEST_TEACHER_EMAIL = 'teacher@dev.local';
    process.env.TEST_TEACHER_PASSWORD = 'x';
    process.env.TEST_STUDENT_EMAIL = 'student@dev.local';
    process.env.TEST_STUDENT_PASSWORD = 'x';
    await expect(globalSetup()).rejects.toThrow(/Cannot sign in as: teacher, student/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('can be skipped for unauthenticated runs', async () => {
    process.env.E2E_SKIP_AUTH_PREFLIGHT = '1';
    await expect(globalSetup()).resolves.toBeUndefined();
  });
});

describe('service-role clients in a deployed run', () => {
  it('are refused', () => {
    process.env[DEPLOYED_TARGET_ENV] = 'https://strummy.online';
    expect(() => assertNotDeployedRun('seed')).toThrow(/deployed-target run/);
  });

  it('are allowed in a local run', () => {
    expect(() => assertNotDeployedRun('seed')).not.toThrow();
  });
});
