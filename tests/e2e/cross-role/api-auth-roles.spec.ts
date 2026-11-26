import crypto from 'node:crypto';

import type { APIRequestContext } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { test, expect } from '../../fixtures';
import { assertNotDeployedRun } from '../../helpers/deployed-target';
import { assertNotProduction } from '../../helpers/prod-guard';

/**
 * Who gets through `withApiAuth` — @security.
 *
 * No mocks: real accounts on the dev stack, real JWTs from GoTrue, real API
 * keys in `api_keys`, real HTTP against the running app. Pins the wrapper most
 * API routes use: 401 without valid credentials, 403 for an account with no
 * profile or without the route's role, and API keys that stop working when
 * revoked or expired. Hermetic: makes its own accounts and deletes them
 * (`api_keys` and `profiles` go with the auth user).
 */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_LOCAL_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const READY = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

const RUN = `api-auth-${Date.now()}`;
/** Throwaway accounts, deleted after the run: a fresh credential each time, none in the repo. */
const throwawayCredential = (): string =>
  ['Aa1!', crypto.randomBytes(16).toString('hex')].join('');
const PASSWORD = throwawayCredential();
const DAY = 24 * 60 * 60 * 1000;

/** Any profile may read it; read-only. */
const ANY_PROFILE = '/api/song';
const TEACHER_ONLY = '/api/teacher/lessons';
const ADMIN_ONLY = '/api/admin/lessons';
/** Writes through the service-role client, so the route itself must check the role. */
const EXTERNAL_SONGS = '/api/external/songs';

type Roles = { is_admin?: boolean; is_teacher?: boolean; is_student?: boolean };

test.describe.configure({ mode: 'serial' });

test.describe('API — who gets through withApiAuth @security @cross-role', () => {
  let service: SupabaseClient;
  let api: APIRequestContext;
  const authIds: string[] = [];
  const token: Record<'student' | 'teacher' | 'admin' | 'noProfile', string> = {
    student: '',
    teacher: '',
    admin: '',
    noProfile: '',
  };
  const key = { active: '', revoked: '', expired: '' };

  async function account(label: string, roles: Roles, keepProfile = true): Promise<string> {
    const email = `${RUN}-${label}@example.test`;
    const { data, error } = await service.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`createUser(${label}): ${error?.message}`);
    authIds.push(data.user.id);

    const profiles = service.from('profiles');
    const { error: profileError } = keepProfile
      ? await profiles
          .update({
            is_admin: false,
            is_teacher: false,
            is_student: false,
            ...roles,
            is_development: true,
          })
          .eq('user_id', data.user.id)
      : await profiles.delete().eq('user_id', data.user.id);
    if (profileError) throw new Error(`profile for ${label}: ${profileError.message}`);

    const visitor = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data: signIn, error: signInError } = await visitor.auth.signInWithPassword({
      email,
      password: PASSWORD,
    });
    if (signInError || !signIn.session)
      throw new Error(`sign in ${label}: ${signInError?.message}`);
    return signIn.session.access_token;
  }

  async function apiKey(ownerAuthId: string, row: { is_active: boolean; expires_at?: string }) {
    const plain = `gcrm_${crypto.randomBytes(24).toString('hex')}`;
    const { error } = await service.from('api_keys').insert({
      user_id: ownerAuthId,
      name: `${RUN} key`,
      key_hash: crypto.createHash('sha256').update(plain).digest('hex'),
      ...row,
    });
    if (error) throw new Error(`api key: ${error.message}`);
    return plain;
  }

  const status = async (path: string, bearer?: string) =>
    (
      await api.get(path, {
        headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
        failOnStatusCode: false,
      })
    ).status();

  test.beforeAll(async ({ playwright, baseURL }) => {
    test.skip(!READY, 'needs the dev stack URL, anon key and service-role key');
    assertNotDeployedRun('create API auth fixtures');
    assertNotProduction(SUPABASE_URL, 'create API auth fixtures');
    service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    token.student = await account('student', { is_student: true });
    token.teacher = await account('teacher', { is_teacher: true });
    token.admin = await account('admin', { is_admin: true });
    token.noProfile = await account('no-profile', {}, false);

    const teacherAuthId = authIds[1];
    key.active = await apiKey(teacherAuthId, { is_active: true });
    key.revoked = await apiKey(teacherAuthId, { is_active: false });
    key.expired = await apiKey(teacherAuthId, {
      is_active: true,
      expires_at: new Date(Date.now() - DAY).toISOString(),
    });

    api = await playwright.request.newContext({ baseURL });
  });

  test.afterAll(async () => {
    await api?.dispose();
    for (const id of authIds) await service.auth.admin.deleteUser(id);
  });

  test('refuses missing, malformed and forged credentials (401)', async () => {
    expect(await status(ANY_PROFILE)).toBe(401);
    expect(await status(ANY_PROFILE, 'not-a-jwt')).toBe(401);
    expect(await status(ANY_PROFILE, `${token.teacher}x`)).toBe(401);
    expect(await status(ANY_PROFILE, 'gcrm_unknown-key')).toBe(401);
  });

  test('refuses a signed-in account that has no profile (403)', async () => {
    expect(await status(ANY_PROFILE, token.noProfile)).toBe(403);
  });

  test('lets every role with a profile through when the route needs none', async () => {
    for (const role of ['student', 'teacher', 'admin'] as const) {
      expect(await status(ANY_PROFILE, token[role]), role).toBe(200);
    }
  });

  test('a role-only route lets in exactly that role', async () => {
    expect(await status(TEACHER_ONLY, token.student)).toBe(403);
    expect(await status(TEACHER_ONLY, token.admin)).toBe(403);
    expect(await status(TEACHER_ONLY, token.teacher)).toBe(200);

    expect(await status(ADMIN_ONLY, token.student)).toBe(403);
    expect(await status(ADMIN_ONLY, token.teacher)).toBe(403);
    expect(await status(ADMIN_ONLY, token.admin)).toBe(200);
  });

  test('an API key acts for its owner until it is revoked or expires', async () => {
    expect(await status(TEACHER_ONLY, key.active)).toBe(200);
    expect(await status(TEACHER_ONLY, key.revoked)).toBe(401);
    expect(await status(TEACHER_ONLY, key.expired)).toBe(401);
  });

  test('only staff add songs through the external API, and only valid ones', async () => {
    const song = { title: `${RUN} song`, author: 'Contract', level: 'beginner', key: 'C' };
    const post = (bearer: string, data: unknown) =>
      api.post(EXTERNAL_SONGS, {
        headers: { Authorization: `Bearer ${bearer}` },
        data,
        failOnStatusCode: false,
      });

    expect((await post(token.student, song)).status()).toBe(403);
    expect((await post(token.teacher, { ...song, level: 'virtuoso' })).status()).toBe(400);

    const created = await post(key.active, song);
    expect(created.status()).toBe(201);
    const { song: row } = (await created.json()) as { song: { id: string; title: string } };
    expect(row.title).toBe(song.title);
    await service.from('songs').delete().eq('id', row.id);
  });
});
