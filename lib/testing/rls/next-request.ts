/**
 * Next's request context for the RLS suites, so app code — server actions and
 * the services that build their own Supabase client — runs as a real
 * signed-in user against the dev stack.
 *
 * `jest.config.rls.ts` maps `next/headers` to this module. The app reads its
 * session from `cookies()` (lib/supabase/server.ts → @supabase/ssr), which
 * throws outside a request; here it serves the cookie jar of whoever the test
 * signed in with {@link actAs}. Nothing behind the cookie is faked: GoTrue
 * checks the JWT, PostgREST applies RLS, and the service-role writes of a
 * server action land in the real tables.
 *
 * ```ts
 * await actAs(fx.teacherA);          // the app now runs as teacher A
 * await markPackagePurchasePaid(...); // real action, real session, real rows
 * ```
 */
import { createServerClient } from '@supabase/ssr';

import { readRlsEnv, type RlsEnv } from './env';

type Cookie = { name: string; value: string };

let jar = new Map<string, string>();

function requireEnv(): RlsEnv {
  const env = readRlsEnv();
  if (!env)
    throw new Error('actAs(): RLS test env not available. Gate the suite with describeIfRls.');
  return env;
}

/**
 * The app's Supabase config prefers the LOCAL_* variables, so pointing them at
 * the stack `readRlsEnv` resolved (and checked against production) makes the
 * app's cookie client and service-role client hit the same database as the
 * test's own fixtures.
 */
function pointAppAtRlsStack(env: RlsEnv): void {
  process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL = env.supabaseUrl;
  process.env.NEXT_PUBLIC_SUPABASE_LOCAL_ANON_KEY = env.anonKey;
  process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY = env.serviceRoleKey;
}

/** Sign `user` in the way the browser does, and run app code as them until the next call. */
export async function actAs(user: { email: string; password: string }): Promise<void> {
  const env = requireEnv();
  pointAppAtRlsStack(env);
  const signedIn = new Map<string, string>();
  const client = createServerClient(env.supabaseUrl, env.anonKey, {
    cookies: {
      getAll: () => [...signedIn].map(([name, value]) => ({ name, value })),
      setAll: (cookies) =>
        cookies.forEach(({ name, value }) =>
          value ? signedIn.set(name, value) : signedIn.delete(name)
        ),
    },
  });
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) throw new Error(`actAs(${user.email}) failed: ${error.message}`);
  if (signedIn.size === 0) throw new Error(`actAs(${user.email}): sign-in set no session cookie`);
  jar = signedIn;
}

/** Run app code with no session at all — an anonymous visitor. */
export function actAsAnonymous(): void {
  pointAppAtRlsStack(requireEnv());
  jar = new Map();
}

/** `next/headers` `cookies()`: the current jar. A token refresh writes back into it. */
export async function cookies() {
  return {
    get: (name: string): Cookie | undefined => {
      const value = jar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    getAll: (): Cookie[] => [...jar].map(([name, value]) => ({ name, value })),
    has: (name: string) => jar.has(name),
    set: (nameOrCookie: string | Cookie, value?: string) => {
      if (typeof nameOrCookie === 'string') jar.set(nameOrCookie, value ?? '');
      else jar.set(nameOrCookie.name, nameOrCookie.value);
    },
    delete: (name: string) => jar.delete(name),
  };
}

/** `next/headers` `headers()`: a request without headers. */
export async function headers(): Promise<Headers> {
  return new Headers();
}
