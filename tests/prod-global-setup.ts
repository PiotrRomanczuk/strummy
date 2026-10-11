import { isProductionUrl } from './helpers/prod-guard';
import { deployedTargetAuth, isProductionAppUrl } from './helpers/deployed-target';

/**
 * Preflight for runs aimed at a DEPLOYED target (playwright.prod.config.ts).
 *
 * WHY THIS EXISTS
 * ---------------
 * On 2026-08-06 the full suite was pointed at https://strummy.online. 72 of 74
 * specs authenticate as `admin|teacher|student@dev.local` — accounts that only
 * exist on the dev stack. Every one of them sat in `page.waitForURL` until the
 * 30s timeout, so the run took 85 minutes locally to report 140 failures whose
 * single cause was "these accounts are not here".
 *
 * The first version of this check signed in against NEXT_PUBLIC_SUPABASE_URL
 * from .env.local — the DEV stack. The dev.local accounts exist there, so the
 * check passed and the run timed out exactly as before (2026-10-11 audit). It
 * now signs in against the target's own auth endpoint (E2E_TARGET_SUPABASE_*),
 * and refuses a production app paired with a non-production auth endpoint.
 */

type Role = 'admin' | 'teacher' | 'student';

const ROLE_ENV: Record<Role, { email: string; password: string }> = {
  admin: { email: 'TEST_ADMIN_EMAIL', password: 'TEST_ADMIN_PASSWORD' },
  teacher: { email: 'TEST_TEACHER_EMAIL', password: 'TEST_TEACHER_PASSWORD' },
  student: { email: 'TEST_STUDENT_EMAIL', password: 'TEST_STUDENT_PASSWORD' },
};

/** Teacher + student exist on prod; admin is checked only when configured. */
const REQUIRED: Role[] = ['teacher', 'student'];

const isDevDefault = (email: string) => email.toLowerCase().endsWith('@dev.local');

async function canSignIn(
  role: Role,
  auth: { url: string; anonKey: string }
): Promise<{ ok: boolean; email: string; reason?: string }> {
  const email = process.env[ROLE_ENV[role].email] || '';
  const password = process.env[ROLE_ENV[role].password] || '';

  if (!email || !password) return { ok: false, email, reason: 'credentials not set' };
  if (isDevDefault(email)) return { ok: false, email, reason: 'dev-stack default account' };

  try {
    const res = await fetch(`${auth.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: auth.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) return { ok: true, email };
    const body = (await res.json().catch(() => ({}))) as { error_description?: string };
    return { ok: false, email, reason: body.error_description || `HTTP ${res.status}` };
  } catch (error) {
    return { ok: false, email, reason: (error as Error).message };
  }
}

function fail(lines: string[]): never {
  throw new Error(['', ...lines, ''].join('\n'));
}

async function globalSetup(): Promise<void> {
  const target = process.env.PLAYWRIGHT_BASE_URL || 'https://strummy.online';
  console.log(`\n🌐 Deployed-target run against ${target}`);

  // Unauthenticated selections (landing page, public routes) need no accounts,
  // and the preflight runs before --grep filtering, so this is the opt-out.
  if (process.env.E2E_SKIP_AUTH_PREFLIGHT === '1') {
    console.log('   E2E_SKIP_AUTH_PREFLIGHT=1 — not checking role accounts.\n');
    return;
  }

  const auth = deployedTargetAuth();
  if (!auth.url || !auth.anonKey) {
    fail([
      'E2E_TARGET_SUPABASE_URL / E2E_TARGET_SUPABASE_ANON_KEY are not set.',
      '',
      `The role accounts must be checked against ${target}'s own auth endpoint,`,
      'not .env.local (which points at dev). Put them in .env.e2e-prod.local',
      '(gitignored) next to the TEST_* accounts. See tests/README.md.',
    ]);
  }
  if (isProductionAppUrl(target) && !isProductionUrl(auth.url)) {
    fail([
      `${target} is production, but E2E_TARGET_SUPABASE_URL (${new URL(auth.url).host})`,
      'is not a production database. The preflight would vouch for accounts that',
      'the app under test has never seen.',
    ]);
  }

  console.log(`   Auth checked against ${new URL(auth.url).host}\n`);

  const adminEmail = process.env.TEST_ADMIN_EMAIL || '';
  const roles: Role[] = adminEmail && !isDevDefault(adminEmail) ? [...REQUIRED, 'admin'] : REQUIRED;
  const results = await Promise.all(roles.map((role) => canSignIn(role, auth)));

  results.forEach((result, i) => {
    const mark = result.ok ? '✅' : '❌';
    const detail = result.ok ? '' : ` — ${result.reason}`;
    console.log(`   ${mark} ${roles[i].padEnd(8)} ${result.email || '(unset)'}${detail}`);
  });
  if (!roles.includes('admin')) console.log('   ⏭  admin    not configured — admin specs excluded');

  if (results.every((r) => r.ok)) {
    console.log('\n   Role accounts sign in. Running.\n');
    return;
  }

  const missing = roles.filter((_, i) => !results[i].ok);
  fail([
    `Cannot sign in as: ${missing.join(', ')} on ${target}.`,
    '',
    'Supply accounts that exist on the target in .env.e2e-prod.local:',
    '',
    '  TEST_TEACHER_EMAIL=...  TEST_TEACHER_PASSWORD=...',
    '  TEST_STUDENT_EMAIL=...  TEST_STUDENT_PASSWORD=...',
    '',
    'To smoke without any accounts, run the unauthenticated subset:',
    '',
    '  E2E_SKIP_AUTH_PREFLIGHT=1 npm run test:pw:prod -- --grep @smoke',
    '',
    'Refusing to start: every authenticated spec would otherwise time out in',
    'page.waitForURL and report a failure whose real cause is this account.',
  ]);
}

export default globalSetup;
