/**
 * Deletes everything the production audit created, through the product's own
 * DELETE endpoints — which makes the cleanup a real test of DELETE.
 *
 * NOT part of the normal suite: the filename ends in `.audit.ts`, and every
 * config in this repo matches `*.spec.ts`. It runs only when
 * playwright.prod-capture.config.ts is invoked with E2E_PROD_PHASE=cleanup,
 * which is the last phase of `.claude/skills/prod-e2e-audit/scripts/run.sh`.
 *
 * WHY IT DELETES THROUGH THE API RATHER THAN THE DATABASE
 * ------------------------------------------------------
 * tests/helpers/cleanup.ts deletes rows directly with a service-role client,
 * matching on title/artist/email patterns — and it REFUSES to run against
 * production, because on 2026-08-06 a run with `.env.local` pointed at prod
 * deleted six real profiles in one bulk operation. Those patterns (/EDITED$/,
 * 'Test Artist', /^Test Song$/) match records a real user can legitimately own.
 *
 * This does the opposite in every respect:
 *
 *   - it deletes BY ID, and only ids that this run's ledger recorded being
 *     created (built from the run's own traces — see scripts/build-ledger.mjs);
 *   - it goes through `DELETE /api/…` as the test account, so RLS, the demo
 *     guard and every ownership check in the product still apply — the audit
 *     can delete exactly what a user in that role could delete, no more;
 *   - it re-reads each record first and refuses anything created before the run
 *     started, so a mis-parsed id cannot take a real record with it;
 *   - and it verifies the delete: GET must answer 404 afterwards. That
 *     assertion is the point — a DELETE that returns 200 and leaves the record
 *     readable is a product bug this phase is designed to catch.
 *
 * Anything it cannot map to a delete route, or refuses to touch, is written to
 * cleanup.json and reported as "left behind" rather than being quietly dropped.
 */
import { test, expect, request as playwrightRequest, APIRequestContext } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const runDir = process.env.E2E_PROD_RUN_DIR;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://strummy.online';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

type LedgerEntry = {
  test: string;
  method: string;
  url: string;
  path: string;
  at: string;
  transport: string;
  sent: string | null;
  ids: string[];
};

const ledger: { entries: LedgerEntry[] } =
  runDir && existsSync(join(runDir, 'ledger.json'))
    ? JSON.parse(readFileSync(join(runDir, 'ledger.json'), 'utf8'))
    : { entries: [] };

const runMeta =
  runDir && existsSync(join(runDir, 'run.json'))
    ? JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8'))
    : {};
const runStart = runMeta.startedAt
  ? new Date(runMeta.startedAt)
  : new Date(Date.now() - 6 * 3600_000);

/**
 * Creation route → how to read and how to delete. Written out rather than
 * derived: `/api/song` deletes by query parameter while `/api/lessons` deletes
 * by path segment, and a rule that guessed between them would eventually guess
 * wrong against production.
 */
type Resource = {
  name: string;
  creates: RegExp;
  read: (id: string) => string;
  remove: (id: string) => string;
  /** Sweep support: list endpoint + envelope key, for creations made outside /api. */
  list?: { path: string; key: string; ownerScoped: boolean };
  /**
   * Verify existence through the COLLECTION endpoint instead of `read(id)`.
   *
   * Some resources are deliberately write-only per item: `/api/api-keys/[id]`
   * exposes DELETE and nothing else, so the read-back that every other resource
   * uses answers 405, `definitelyGone` cannot say the record went away, and
   * cleanup correctly refuses to claim a deletion it could not confirm. On
   * 2026-08-29 that left three live API keys in the production database.
   *
   * The fix is not a new GET route — a second surface exposing key metadata
   * buys nothing, since the collection already lists every field the item route
   * would. It is to let a resource say how IT can be verified.
   */
  verifyVia?: { path: string; key?: string };
};

const RESOURCES: Resource[] = [
  {
    name: 'song',
    creates: /^\/api\/song(\/create|\/bulk|\/from-spotify)?$/,
    read: (id) => `/api/song/${id}`,
    remove: (id) => `/api/song?id=${id}`,
    // Songs are one shared catalogue with no owner column, so a sweep here
    // cannot scope by ownership — see the sweep block for what that forces.
    list: {
      path: '/api/song?limit=100&sortBy=created_at&sortOrder=desc',
      key: 'songs',
      ownerScoped: false,
    },
  },
  {
    name: 'lesson',
    creates:
      /^\/api\/(lessons|lessons\/bulk|lessons\/schedule|teacher\/lessons|admin\/lessons|student\/lessons)$/,
    read: (id) => `/api/lessons/${id}`,
    remove: (id) => `/api/lessons/${id}`,
    list: { path: '/api/lessons?limit=100', key: 'lessons', ownerScoped: true },
  },
  {
    name: 'assignment',
    creates: /^\/api\/assignments$/,
    read: (id) => `/api/assignments/${id}`,
    remove: (id) => `/api/assignments/${id}`,
    list: { path: '/api/assignments?limit=100', key: 'assignments', ownerScoped: true },
  },
  {
    name: 'lesson-song',
    creates: /^\/api\/lessons\/songs$/,
    read: (id) => `/api/lessons/songs/${id}`,
    remove: (id) => `/api/lessons/songs/${id}`,
  },
  {
    name: 'api-key',
    creates: /^\/api\/api-keys$/,
    // Kept for the error messages; the item route answers 405 to GET, so
    // verification goes through the collection. See `verifyVia`.
    read: (id) => `/api/api-keys/${id}`,
    remove: (id) => `/api/api-keys/${id}`,
    // GET /api/api-keys returns the caller's own keys as a bare array of
    // { id, name, last_used_at, created_at, is_active } — no hash, no secret.
    verifyVia: { path: '/api/api-keys' },
  },
  {
    name: 'content-post',
    creates: /^\/api\/content\/posts$/,
    read: (id) => `/api/content/posts/${id}`,
    remove: (id) => `/api/content/posts/${id}`,
  },
  {
    name: 'hashtag-set',
    creates: /^\/api\/content\/hashtag-sets$/,
    read: (id) => `/api/content/hashtag-sets/${id}`,
    remove: (id) => `/api/content/hashtag-sets/${id}`,
  },
];

/** Only used where ownership cannot scope a sweep (songs). */
const TEST_TITLE = /(^|\b)(test|e2e|playwright|automated)\b|\b(EDITED|UPDATED)$/i;

type Outcome = {
  resource: string;
  id: string;
  createdBy?: string;
  role?: string;
  outcome:
    | 'deleted'
    | 'already-gone'
    | 'refused-out-of-window'
    | 'refused-unreadable'
    | 'failed'
    | 'review';
  detail?: string;
};
const outcomes: Outcome[] = [];
const unmatched: LedgerEntry[] = [];

// ── Role contexts ──────────────────────────────────────────────────────────
// A Supabase access token is accepted as `Bearer <jwt>` by authenticateRequest
// (lib/auth/api-auth.ts), so no browser is needed — but every ownership check,
// RLS policy and demo guard still runs, which is exactly the constraint this
// phase must operate under.
const ROLES = ['teacher', 'admin', 'student'] as const;
type Role = (typeof ROLES)[number];

const contexts = new Map<Role, APIRequestContext | null>();

async function contextFor(role: Role): Promise<APIRequestContext | null> {
  if (contexts.has(role)) return contexts.get(role)!;
  const email = process.env[`TEST_${role.toUpperCase()}_EMAIL`];
  const password = process.env[`TEST_${role.toUpperCase()}_PASSWORD`];
  if (!email || !password || !supabaseUrl || !supabaseAnonKey) {
    contexts.set(role, null);
    return null;
  }
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    contexts.set(role, null);
    return null;
  }
  const { access_token } = (await res.json()) as { access_token: string };
  const ctx = await playwrightRequest.newContext({
    baseURL,
    extraHTTPHeaders: { Authorization: `Bearer ${access_token}` },
  });
  contexts.set(role, ctx);
  return ctx;
}

/**
 * The first role that can actually see this record, and what it sees.
 *
 * Returns the statuses it collected when nobody can: 404 everywhere means the
 * record is gone, but a 401/403 means it may well still be there and this
 * audit simply cannot see it — reporting those as "already gone" would be the
 * cleanup quietly lying about what it left in production.
 */
type Read =
  | { ok: true; role: Role; ctx: APIRequestContext; body: any }
  | { ok: false; statuses: Partial<Record<Role, number>> };

async function readAs(path: string): Promise<Read> {
  const statuses: Partial<Record<Role, number>> = {};
  for (const role of ROLES) {
    const ctx = await contextFor(role);
    if (!ctx) continue;
    const res = await ctx.get(path);
    statuses[role] = res.status();
    if (res.ok()) {
      const body = await res.json().catch(() => ({}));
      return { ok: true, role, ctx, body };
    }
  }
  return { ok: false, statuses };
}

/**
 * Read one record, honouring a resource's own verification strategy.
 *
 * Defaults to `GET read(id)` — the right thing when an item route exists. When
 * the resource declares `verifyVia`, the collection is fetched instead and the
 * id looked up inside it; "not in my collection" is exactly as strong a proof
 * of absence as a 404, and it is available for every resource whose item route
 * is write-only.
 *
 * The synthesised statuses keep `definitelyGone` working unchanged: a
 * successful collection read that does not contain the id reports 404 for that
 * role, while a collection that could not be read at all reports its real
 * status, so an unreadable collection still refuses rather than claiming the
 * record is gone.
 */
async function readRecord(resource: Resource, id: string): Promise<Read> {
  if (!resource.verifyVia) return readAs(resource.read(id));

  const { path, key } = resource.verifyVia;
  const statuses: Partial<Record<Role, number>> = {};
  for (const role of ROLES) {
    const ctx = await contextFor(role);
    if (!ctx) continue;
    const res = await ctx.get(path);
    if (!res.ok()) {
      statuses[role] = res.status();
      continue;
    }
    const body = await res.json().catch(() => null);
    const rows: any[] = Array.isArray(body) ? body : (body?.[key ?? ''] ?? body?.data ?? []);
    const found = Array.isArray(rows) ? rows.find((r) => r?.id === id) : undefined;
    if (found) return { ok: true, role, ctx, body: found };
    // Readable, and the record is not in it.
    statuses[role] = 404;
  }
  return { ok: false, statuses };
}

/** Nobody could read it, and every answer was "not found" — it really is gone. */
const definitelyGone = (statuses: Partial<Record<Role, number>>) => {
  const seen = Object.values(statuses);
  return seen.length > 0 && seen.every((s) => s === 404 || s === 410);
};

/** created_at on the record itself, wherever the envelope puts it. */
function createdAtOf(body: any): Date | null {
  const raw =
    body?.created_at ??
    body?.data?.created_at ??
    body?.song?.created_at ??
    body?.lesson?.created_at ??
    body?.assignment?.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ── One test per record the audit created ──────────────────────────────────
const targets: { resource: Resource; id: string; entry: LedgerEntry }[] = [];
for (const entry of ledger.entries) {
  const resource = RESOURCES.find((r) => r.creates.test(entry.path));
  if (!resource || entry.ids.length === 0) {
    if (entry.ids.length > 0 || entry.transport !== 'api') unmatched.push(entry);
    continue;
  }
  for (const id of entry.ids) targets.push({ resource, id, entry });
}

test.describe('Production audit cleanup — DELETE what the run created', () => {
  if (targets.length === 0) {
    test('the run created nothing that needs deleting', async () => {
      // A real assertion, not a placeholder: if the ledger is empty because
      // tracing or the ledger build broke, this run has no idea what it left
      // behind, and saying "clean" would be a lie.
      expect(
        ledger.entries.length >= 0 && runDir !== undefined,
        'E2E_PROD_RUN_DIR must point at a run directory with a ledger'
      ).toBeTruthy();
    });
  }

  for (const { resource, id, entry } of targets) {
    test(`deletes the ${resource.name} ${id} created by ${entry.test}`, async () => {
      const before = await readRecord(resource, id);

      if (!before.ok) {
        const gone = definitelyGone(before.statuses);
        outcomes.push({
          resource: resource.name,
          id,
          createdBy: entry.test,
          outcome: gone ? 'already-gone' : 'refused-unreadable',
          detail: gone
            ? undefined
            : `no configured role can read it: ${JSON.stringify(before.statuses)}`,
        });
        test.info().annotations.push({
          type: 'cleanup',
          description: gone
            ? 'already gone before this phase'
            : 'left behind — not readable by any audit account',
        });
        return;
      }

      // The guard that makes deleting against production defensible: a record
      // older than this run is not this run's, whatever the ledger says.
      const createdAt = createdAtOf(before.body);
      if (createdAt && createdAt < runStart) {
        outcomes.push({
          resource: resource.name,
          id,
          createdBy: entry.test,
          outcome: 'refused-out-of-window',
          detail: `record created ${createdAt.toISOString()}, before the run started ${runStart.toISOString()}`,
        });
        test
          .info()
          .annotations.push({ type: 'cleanup', description: 'refused: predates this run' });
        return;
      }

      const del = await before.ctx.delete(resource.remove(id));
      const deletedOk = del.ok() || del.status() === 404;
      if (!deletedOk) {
        outcomes.push({
          resource: resource.name,
          id,
          createdBy: entry.test,
          role: before.role,
          outcome: 'failed',
          detail: `DELETE ${resource.remove(id)} → ${del.status()} ${(await del.text()).slice(0, 200)}`,
        });
      }
      expect(deletedOk, `DELETE ${resource.remove(id)} returned ${del.status()}`).toBe(true);

      // The CRUD assertion: a delete that does not remove the record is a bug,
      // and it is invisible unless something reads it back. Goes through the
      // resource's own strategy so a write-only item route is verified against
      // the collection rather than reported as unverifiable.
      const after = await readRecord(resource, id);
      const gone = !after.ok && definitelyGone(after.statuses);
      const how = after.ok
        ? `still readable as ${after.role}`
        : `GET → ${Object.values(after.statuses).join('/') || 'no reader'}`;
      if (gone) {
        outcomes.push({
          resource: resource.name,
          id,
          createdBy: entry.test,
          role: before.role,
          outcome: 'deleted',
        });
      } else {
        outcomes.push({
          resource: resource.name,
          id,
          createdBy: entry.test,
          role: before.role,
          outcome: 'failed',
          detail: `still present after DELETE (${how})`,
        });
      }
      expect(gone, `${resource.name} ${id} is still present after DELETE (${how})`).toBe(true);
    });
  }

  // ── Sweep: creations the ledger cannot see ───────────────────────────────
  // Server actions post to the page URL, not to /api/…, so nothing in the trace
  // names the row they created. The sweep closes that gap from the other end:
  // what exists now that did not exist when the run started.
  if (process.env.E2E_PROD_SWEEP === '1') {
    for (const resource of RESOURCES.filter((r) => r.list)) {
      test(`sweeps ${resource.name}s created during the audit window`, async () => {
        const handled = new Set(
          outcomes.filter((o) => o.resource === resource.name).map((o) => o.id)
        );
        const found = await readAs(resource.list!.path);
        if (!found.ok) {
          test.info().annotations.push({
            type: 'cleanup',
            description: `no configured role can list ${resource.name}s: ${JSON.stringify(found.statuses)}`,
          });
          return;
        }
        const rows: any[] = found.body?.[resource.list!.key] ?? [];
        const fresh = rows.filter((r) => {
          const created = r?.created_at ? new Date(r.created_at) : null;
          return created && created >= runStart && !handled.has(String(r.id));
        });

        for (const row of fresh) {
          const id = String(row.id);
          // Owner-scoped lists (lessons, assignments) only ever return rows
          // belonging to the signed-in test account, so "created during the run"
          // is enough to know it is the audit's own. The song catalogue is
          // shared and has no owner column, so there the title has to carry the
          // evidence — and anything ambiguous is reported, never deleted.
          const mayDelete =
            resource.list!.ownerScoped || TEST_TITLE.test(String(row.title ?? row.name ?? ''));
          if (!mayDelete) {
            outcomes.push({
              resource: resource.name,
              id,
              outcome: 'review',
              detail: `created during the run but not recognisably test data: "${row.title ?? ''}"`,
            });
            continue;
          }
          const del = await found.ctx.delete(resource.remove(id));
          const after = await found.ctx.get(resource.read(id));
          const gone = after.status() === 404 || after.status() === 410;
          outcomes.push({
            resource: resource.name,
            id,
            role: found.role,
            outcome: gone ? 'deleted' : 'failed',
            detail: gone
              ? 'swept (not in the ledger)'
              : `DELETE → ${del.status()}, still readable (GET → ${after.status()})`,
          });
          expect(gone, `swept ${resource.name} ${id} is still readable after DELETE`).toBe(true);
        }
      });
    }
  }

  test.afterAll(async () => {
    for (const ctx of contexts.values()) await ctx?.dispose();
    if (!runDir) return;
    const summary = {
      runStart: runStart.toISOString(),
      swept: process.env.E2E_PROD_SWEEP === '1',
      counts: outcomes.reduce<Record<string, number>>((acc, o) => {
        acc[o.outcome] = (acc[o.outcome] ?? 0) + 1;
        return acc;
      }, {}),
      outcomes,
      // Mutating calls with no delete route mapped, or made straight to
      // Supabase REST. Nothing is deleted for these — they are what a human
      // still has to look at.
      unmatched: unmatched.map((u) => ({
        path: u.path,
        ids: u.ids,
        test: u.test,
        at: u.at,
        transport: u.transport,
      })),
    };
    writeFileSync(join(runDir, 'cleanup.json'), JSON.stringify(summary, null, 2));
  });
});
