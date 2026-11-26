import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * trigger.sh decides, unattended on uwh, whether the suite runs at all. Both of
 * its mistakes are silent: dispatching every time brings back the runs that
 * re-test an unchanged dev, and skipping when it should not leaves a changed
 * dev schema untested until the night. So the decision is pinned here.
 *
 * The script only talks to `gh` and `docker`, so both are replaced by stubs on
 * PATH: `gh run list` prints the run titles a test provides, `gh workflow run`
 * records its arguments, `docker exec … pg_dump` prints a schema.
 */

const SCRIPT = join(process.cwd(), 'scripts/ops/nightly-e2e/trigger.sh');

const GH_STUB = `#!/usr/bin/env bash
case "$1 $2" in
  "api "*) echo "$2" >> "$FAKE_DIR/api"; [ -n "$FAKE_SHA" ] && echo "$FAKE_SHA" || exit 1 ;;
  "run list") echo "$*" >> "$FAKE_DIR/listed"; cat "$FAKE_DIR/titles" ;;
  "workflow run") echo "$*" >> "$FAKE_DIR/dispatched" ;;
esac
`;
const DOCKER_STUB = `#!/usr/bin/env bash
[ -n "$FAKE_SCHEMA" ] && echo "$FAKE_SCHEMA" || exit 1
`;

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'nightly-trigger-'));
  for (const [name, body] of [
    ['gh', GH_STUB],
    ['docker', DOCKER_STUB],
  ]) {
    writeFileSync(join(dir, name), body);
    chmodSync(join(dir, name), 0o755);
  }
  writeFileSync(join(dir, 'titles'), '');
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

type State = { sha?: string; schema?: string; titles?: string[]; dryRun?: boolean };

function trigger(kind: string, state: State = {}) {
  writeFileSync(join(dir, 'titles'), (state.titles ?? []).join('\n'));
  const result = spawnSync('bash', [SCRIPT, kind], {
    encoding: 'utf8',
    env: {
      PATH: `${dir}:${process.env.PATH}`,
      FAKE_DIR: dir,
      FAKE_SHA: state.sha ?? 'cd143ef9aaaabbbbccccddddeeeeffff00001111',
      FAKE_SCHEMA: state.schema ?? 'CREATE TABLE public.songs (id uuid);',
      ...(state.dryRun ? { NIGHTLY_TRIGGER_DRY_RUN: '1' } : {}),
    },
  });
  const file = join(dir, 'dispatched');
  const dispatched = existsSync(file) ? readFileSync(file, 'utf8').trim().split('\n') : [];
  return { status: result.status, output: result.stdout + result.stderr, dispatched };
}

/** The key a dispatch carried, from the recorded `-f key=…` argument. */
const keyOf = (call: string) => call.match(/key=(\S*)/)?.[1] ?? '';

describe('nightly-e2e trigger', () => {
  // The suite runs against the dev stack, so it must test dev's code: on main
  // it failed every night a migration sat on dev first (#1115, #1118).
  it('daytime dispatches a state that has no run yet, on dev, with its key', () => {
    const { status, dispatched } = trigger('daytime');

    expect(status).toBe(0);
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toContain('--ref dev');
    expect(readFileSync(join(dir, 'api'), 'utf8')).toContain('/commits/dev');
    expect(readFileSync(join(dir, 'listed'), 'utf8')).toContain('--branch dev');
    expect(dispatched[0]).toContain('kind=daytime');
    expect(keyOf(dispatched[0])).toMatch(/^cd143ef9-[0-9a-f]{8}$/);
  });

  it('daytime skips a state that already has a run, whatever its kind', () => {
    const key = keyOf(trigger('daytime').dispatched[0]);
    rmSync(join(dir, 'dispatched'));

    const { status, output, dispatched } = trigger('daytime', {
      titles: ['Nightly E2E · manual', `Nightly E2E · nightly · ${key}`],
    });

    expect(status).toBe(0);
    expect(dispatched).toHaveLength(0);
    expect(output).toContain('skipping');
  });

  it('daytime runs again when only the dev schema changed', () => {
    const before = keyOf(trigger('daytime').dispatched[0]);

    const { dispatched } = trigger('daytime', {
      schema: 'CREATE TABLE public.songs (id uuid, notes text);',
      titles: [`Nightly E2E · daytime · ${before}`],
    });

    expect(dispatched).toHaveLength(2);
    expect(keyOf(dispatched[1])).not.toBe(before);
    expect(keyOf(dispatched[1]).slice(0, 8)).toBe(before.slice(0, 8));
  });

  it('daytime runs again when only dev moved', () => {
    const before = keyOf(trigger('daytime').dispatched[0]);

    const { dispatched } = trigger('daytime', {
      sha: '0123456789abcdef0123456789abcdef01234567',
      titles: [`Nightly E2E · daytime · ${before}`],
    });

    expect(keyOf(dispatched[1])).toMatch(/^01234567-/);
    expect(keyOf(dispatched[1]).slice(9)).toBe(before.slice(9));
  });

  it('ignores pg_dump noise that differs between two dumps of one schema', () => {
    const a = keyOf(
      trigger('daytime', { schema: '\\restrict aaa\nCREATE TABLE t ();' }).dispatched[0]
    );
    const b = keyOf(
      trigger('daytime', { schema: '\\restrict bbb\nCREATE TABLE t ();' }).dispatched[1]
    );

    expect(a).toBe(b);
  });

  it('daytime fails without dispatching when the dev schema cannot be read', () => {
    const { status, dispatched } = trigger('daytime', { schema: '' });

    expect(status).toBe(1);
    expect(dispatched).toHaveLength(0);
  });

  it('nightly dispatches even when this state was tested during the day', () => {
    const key = keyOf(trigger('daytime').dispatched[0]);

    const { dispatched } = trigger('nightly', { titles: [`Nightly E2E · daytime · ${key}`] });

    expect(dispatched[1]).toContain('kind=nightly');
    expect(keyOf(dispatched[1])).toBe(key);
  });

  it('nightly still dispatches, without a key, when the dev database is down', () => {
    const { status, dispatched } = trigger('nightly', { schema: '' });

    expect(status).toBe(0);
    expect(dispatched[0]).toContain('kind=nightly');
    expect(keyOf(dispatched[0])).toBe('');
  });

  it('a dry run reports the decision and dispatches nothing', () => {
    const { status, output, dispatched } = trigger('nightly', { dryRun: true });

    expect(status).toBe(0);
    expect(dispatched).toHaveLength(0);
    expect(output).toContain('would dispatch');
  });

  it('rejects an unknown kind', () => {
    expect(trigger('weekly').status).toBe(64);
  });
});
