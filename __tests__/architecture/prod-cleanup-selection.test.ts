import type { PlaywrightTestConfig } from '@playwright/test';

// The Playwright runtime does not load under Jest; the configs only need these two.
jest.mock('@playwright/test', () => ({
  defineConfig: (config: unknown) => config,
  devices: new Proxy({}, { get: () => ({}) }),
}));

/**
 * The production audit's last phase deletes what the run created
 * (tests/e2e/prod-cleanup.audit.ts). It is selected by `testMatch` alone and
 * carries no tag, while the prod projects only run `@prod-safe` tests. From
 * 2026-10-11 the phase inherited that project grep, selected zero tests and
 * exited 1 on every audit — so nothing the run created was ever deleted, and
 * the failure read as a generic "audit=1".
 */
async function loadConfig(phase: string | undefined): Promise<PlaywrightTestConfig> {
  const previous = process.env.E2E_PROD_PHASE;
  if (phase === undefined) delete process.env.E2E_PROD_PHASE;
  else process.env.E2E_PROD_PHASE = phase;
  let config: PlaywrightTestConfig = {};
  await jest.isolateModulesAsync(async () => {
    config = (await import('../../playwright.prod-capture.config')).default;
  });
  if (previous === undefined) delete process.env.E2E_PROD_PHASE;
  else process.env.E2E_PROD_PHASE = previous;
  return config;
}

describe('prod audit cleanup selection', () => {
  it('the cleanup phase selects the cleanup file on every project, with no tag filter', async () => {
    const config = await loadConfig('cleanup');
    expect(String(config.testMatch)).toMatch(/prod-cleanup/);
    expect(config.projects?.length).toBeGreaterThan(0);
    for (const project of config.projects ?? []) {
      expect(project.grep).toBeUndefined();
    }
  });

  it('the audit phase still runs only @prod-safe tests', async () => {
    const config = await loadConfig(undefined);
    expect(config.projects?.length).toBeGreaterThan(0);
    for (const project of config.projects ?? []) {
      expect(String(project.grep)).toContain('@prod-safe');
    }
  });
});
