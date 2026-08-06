import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

/**
 * Preflight for runs aimed at a DEPLOYED target (playwright.prod.config.ts).
 *
 * WHY THIS EXISTS
 * ---------------
 * On 2026-08-06 the full suite was pointed at https://strummy.online. 72 of 74
 * specs authenticate as `admin|teacher|student@dev.local` — accounts that only
 * exist on the dev stack. Every one of them sat in `page.waitForURL` until the
 * 30s timeout, so the run took 85 minutes locally to report 140 failures whose
 * single cause was "these accounts are not here". The signal-to-noise was zero
 * and the cause was invisible in the output.
 *
 * So: check the credentials against the target BEFORE running anything, and
 * fail in seconds with the reason and the fix. A run that cannot work should
 * say so immediately rather than time out 324 times.
 */

type Role = 'admin' | 'teacher' | 'student';

const ROLE_ENV: Record<Role, { email: string; password: string }> = {
  admin: { email: 'TEST_ADMIN_EMAIL', password: 'TEST_ADMIN_PASSWORD' },
  teacher: { email: 'TEST_TEACHER_EMAIL', password: 'TEST_TEACHER_PASSWORD' },
  student: { email: 'TEST_STUDENT_EMAIL', password: 'TEST_STUDENT_PASSWORD' },
};

function authEndpoint(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return { url, anonKey };
}

async function canSignIn(role: Role): Promise<{ ok: boolean; email: string; reason?: string }> {
  const email = process.env[ROLE_ENV[role].email] || '';
  const password = process.env[ROLE_ENV[role].password] || '';
  const { url, anonKey } = authEndpoint();

  if (!email || !password) return { ok: false, email, reason: 'credentials not set' };
  if (!url || !anonKey) return { ok: false, email, reason: 'Supabase URL/anon key not set' };

  try {
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) return { ok: true, email };
    const body = (await res.json().catch(() => ({}))) as { error_description?: string };
    return { ok: false, email, reason: body.error_description || `HTTP ${res.status}` };
  } catch (error) {
    return { ok: false, email, reason: (error as Error).message };
  }
}

async function globalSetup(): Promise<void> {
  const target = process.env.PLAYWRIGHT_BASE_URL || 'https://strummy.online';
  console.log(`\n🌐 Deployed-target run against ${target}`);

  // Unauthenticated selections (landing page, sign-in, public routes) need no
  // accounts, and the preflight cannot tell which specs --grep selected — it
  // runs before filtering. This is the opt-out for those runs.
  if (process.env.E2E_SKIP_AUTH_PREFLIGHT === '1') {
    console.log('   E2E_SKIP_AUTH_PREFLIGHT=1 — not checking role accounts.\n');
    return;
  }

  console.log(`   Auth checked against ${authEndpoint().url || '(unset)'}\n`);

  const roles: Role[] = ['admin', 'teacher', 'student'];
  const results = await Promise.all(roles.map((role) => canSignIn(role)));

  results.forEach((result, i) => {
    const mark = result.ok ? '✅' : '❌';
    const detail = result.ok ? '' : ` — ${result.reason}`;
    console.log(`   ${mark} ${roles[i].padEnd(8)} ${result.email || '(unset)'}${detail}`);
  });

  if (results.every((r) => r.ok)) {
    console.log('\n   All role accounts sign in. Running the full suite.\n');
    return;
  }

  const missing = roles.filter((_, i) => !results[i].ok);
  throw new Error(
    [
      '',
      `Cannot sign in as: ${missing.join(', ')} on ${target}.`,
      '',
      'The suite defaults to admin|teacher|student@dev.local, which exist only on the',
      'dev stack. Against a deployed target you must supply accounts that exist there:',
      '',
      '  TEST_TEACHER_EMAIL=... TEST_TEACHER_PASSWORD=... \\',
      '  TEST_STUDENT_EMAIL=...  TEST_STUDENT_PASSWORD=... \\',
      '    npx playwright test --config=playwright.prod.config.ts',
      '',
      'To smoke a deployment without any accounts, run the unauthenticated subset',
      'and opt out of this check:',
      '',
      '  E2E_SKIP_AUTH_PREFLIGHT=1 \\',
      '    npx playwright test --config=playwright.prod.config.ts --grep @smoke',
      '',
      'Refusing to start: without these, every authenticated spec would sit in',
      'page.waitForURL until it times out and report a failure whose real cause is',
      'this missing account.',
      '',
    ].join('\n')
  );
}

export default globalSetup;
