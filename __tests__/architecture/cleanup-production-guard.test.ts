import { isProductionUrl, isProtectedAccount } from '../../tests/helpers/cleanup';
import { assertNotProduction, serviceRoleTarget } from '../../tests/helpers/prod-guard';

/**
 * The E2E teardown deletes rows by pattern. On 2026-08-06 `.env.local` was left
 * pointing at production by scripts/development/switch-db.sh, and a plain
 * `npx playwright test <spec>` ran that teardown against the live database:
 * six profiles were deleted at 15:33:17 in one bulk operation, visible only in
 * audit_log after the fact.
 *
 * That run happened to match only test accounts. The patterns cleanup.ts deletes
 * on include /EDITED$/, /UPDATED$/, 'Test Artist' and /^Test Song$/ — a real song
 * can satisfy those. isProductionUrl is the guard that stops it, so it gets a
 * test: an unverified guard is indistinguishable from no guard.
 */
describe('cleanup production guard', () => {
  describe('refuses production targets', () => {
    it.each([
      ['the Supabase URL behind strummy.online', 'https://db.strummy.online'],
      ['production Postgres on the LAN', 'postgresql://u:p@192.168.1.75:54322/postgres'],
      ['the prod DB container', 'postgresql://u:p@supabase_db_StudentProduction:5432/postgres'],
      ['prod Kong on the LAN', 'http://192.168.1.75:54321'],
      ['the legacy prod host', 'https://strummy-db.marszal-arts.online'],
    ])('%s', (_label, url) => {
      expect(isProductionUrl(url)).toBe(true);
    });

    it('is case-insensitive on the host', () => {
      expect(isProductionUrl('https://DB.STRUMMY.ONLINE')).toBe(true);
    });
  });

  describe('allows non-production targets', () => {
    it.each([
      ['dev Kong', 'http://192.168.1.75:55321'],
      ['dev Postgres', 'postgresql://u:p@192.168.1.75:55322/postgres'],
      ['a laptop-local stack', 'http://127.0.0.1:54321'],
    ])('%s', (_label, url) => {
      expect(isProductionUrl(url)).toBe(false);
    });

    it('distinguishes dev from prod on the same host by port alone', () => {
      // CLAUDE.md: "Port 54321 is PRODUCTION — never assume it's local."
      // Host matching alone would classify the dev stack as production and
      // block every legitimate cleanup, so the port has to carry the decision.
      expect(isProductionUrl('postgresql://u:p@192.168.1.75:54322/postgres')).toBe(true);
      expect(isProductionUrl('postgresql://u:p@192.168.1.75:55322/postgres')).toBe(false);
    });
  });

  describe('fails open only where it is safe to', () => {
    it.each([
      ['an empty string', ''],
      ['an unparseable value', 'not a url'],
    ])('treats %s as non-production', (_label, url) => {
      // A missing/garbled URL means cleanup has no configured target and will
      // fail on its own; refusing here would only mask that with a wrong reason.
      expect(isProductionUrl(url)).toBe(false);
    });
  });

  describe('service-role target', () => {
    const ENV_KEYS = [
      'NEXT_PUBLIC_SUPABASE_LOCAL_URL',
      'NEXT_PUBLIC_SUPABASE_REMOTE_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
    ] as const;
    const saved: Record<string, string | undefined> = {};

    beforeEach(() => {
      ENV_KEYS.forEach((k) => {
        saved[k] = process.env[k];
        delete process.env[k];
      });
    });
    afterEach(() => {
      ENV_KEYS.forEach((k) => {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      });
    });

    it('resolves REMOTE_URL before URL, so the guard sees the URL cleanup deletes on', () => {
      // The old guard read LOCAL || URL while cleanup deleted on
      // LOCAL || REMOTE || URL: REMOTE=prod + URL=dev passed the guard.
      process.env.NEXT_PUBLIC_SUPABASE_REMOTE_URL = 'https://db.strummy.online';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://192.168.1.75:55321';
      const { url } = serviceRoleTarget();
      expect(url).toBe('https://db.strummy.online');
      expect(() => assertNotProduction(url, 'seed')).toThrow(/PRODUCTION/);
    });

    it('lets a dev target through', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://192.168.1.75:55321';
      expect(() => assertNotProduction(serviceRoleTarget().url, 'seed')).not.toThrow();
    });

    it('marks the refusal so globalTeardown re-throws it', () => {
      try {
        assertNotProduction('https://db.strummy.online', 'seed');
      } catch (error) {
        expect((error as { isProductionRefusal?: boolean }).isProductionRefusal).toBe(true);
      }
      expect.assertions(1);
    });
  });

  describe('protected accounts', () => {
    it.each([
      'p.romanczuk@gmail.com',
      'p.romanczuk+testteacher@gmail.com',
      'P.Romanczuk+TestStudent@gmail.com',
      'teacher@dev.local',
    ])('protects %s', (email) => {
      expect(isProtectedAccount(email)).toBe(true);
    });

    it('does not protect pattern-matched test users', () => {
      expect(isProtectedAccount('e2e.student.123@example.com')).toBe(false);
    });
  });
});
