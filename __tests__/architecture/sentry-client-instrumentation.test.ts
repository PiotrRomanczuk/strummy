import fs from 'node:fs';
import path from 'node:path';

/**
 * RATCHET — client-side Sentry init must live in `instrumentation-client.ts`.
 *
 * Next 16 builds with Turbopack (see `experimental.turbopackFileSystemCacheForBuild`
 * in next.config.ts). The Sentry SDK's Turbopack path injects the client config
 * by matching `**\/instrumentation-client.*` only
 * (node_modules/@sentry/nextjs/.../config/turbopack/generateValueInjectionRules.js).
 * The legacy `sentry.client.config.ts` name is read exclusively by the SDK's
 * WEBPACK path (`getClientSentryConfigFile` in config/webpack.js), which never
 * runs in this project.
 *
 * The failure mode is completely silent: the file type-checks, lints, imports
 * cleanly, and reads as correct in review — but it is never bundled, so
 * `Sentry.init` never executes in the browser. That shipped to production on
 * 2026-07-29 (PR #570) and left every client-side error invisible: all error
 * boundaries, session replay, and breadcrumbs reported nowhere, while the
 * server half worked fine and made the setup look healthy. Confirmed live via
 * `window.__SENTRY__ === undefined` on strummy.vercel.app and zero client
 * config chunks in the deployment's build log.
 *
 * Nothing else catches this — there is no runtime assertion to hang a unit test
 * on, and a passing build proves nothing. Hence a static check.
 */

const REPO_ROOT = path.resolve(__dirname, '..', '..');

const read = (relativePath: string): string =>
  fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf-8');

const exists = (relativePath: string): boolean => fs.existsSync(path.join(REPO_ROOT, relativePath));

describe('Sentry client instrumentation wiring', () => {
  it('initializes Sentry from a file name Turbopack actually bundles', () => {
    const candidates = [
      'instrumentation-client.ts',
      'instrumentation-client.js',
      path.join('src', 'instrumentation-client.ts'),
      path.join('src', 'instrumentation-client.js'),
    ];

    const found = candidates.filter(exists);

    expect(found.length).toBeGreaterThan(0);
    expect(read(found[0])).toContain('Sentry.init');
  });

  it('does not keep the legacy sentry.client.config name, which is silently ignored', () => {
    // Present-but-ignored is strictly worse than absent: it looks like working
    // configuration while contributing nothing to the bundle.
    expect(exists('sentry.client.config.ts')).toBe(false);
    expect(exists('sentry.client.config.js')).toBe(false);
  });

  it('reads the DSN from the public env var so the value is inlined at build time', () => {
    expect(read('instrumentation-client.ts')).toContain('NEXT_PUBLIC_SENTRY_DSN');
  });

  it('exports onRouterTransitionStart so App Router navigations are instrumented', () => {
    // Only meaningful once the file has a name Next reads — this export was
    // already present under the old name and did nothing.
    expect(read('instrumentation-client.ts')).toContain('onRouterTransitionStart');
  });

  it('still initializes the server and edge runtimes from the instrumentation hook', () => {
    // The server half was never broken; this guards against a future "cleanup"
    // that moves these into the same trap the client config fell into.
    const instrumentation = read('instrumentation.ts');

    expect(instrumentation).toContain('./sentry.server.config');
    expect(instrumentation).toContain('./sentry.edge.config');
    expect(instrumentation).toContain('onRequestError');
    expect(exists('sentry.server.config.ts')).toBe(true);
    expect(exists('sentry.edge.config.ts')).toBe(true);
  });
});
