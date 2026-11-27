import { adminClient } from './seed-ids';

/**
 * Hard delete of what a spec created, for its `afterAll`
 * (.claude/rules/playwright-testing.md: every spec deletes what it creates).
 *
 * The app's own delete endpoints only set `deleted_at`, and a row made through
 * the UI has no id the spec could have kept. So a spec puts one unique token
 * (its `Date.now()`) into every title, name and address it creates and deletes
 * by that token — never by a prefix another spec could share.
 */
function assertToken(token: string | number): string {
  const text = String(token);
  if (text.length < 8) throw new Error(`purge: token "${text}" is too short to be unique`);
  return text;
}

/** Rows of `table` whose `column` contains the spec's token. */
export async function purgeByToken(
  table: string,
  column: string,
  token: string | number
): Promise<void> {
  const { error } = await adminClient()
    .from(table)
    .delete()
    .like(column, `%${assertToken(token)}%`);
  if (error) throw new Error(`purge ${table}.${column} ~ ${token}: ${error.message}`);
}

/**
 * Accounts whose address contains the token: the sign-in account (its profile,
 * lessons and history cascade), then profiles that never had one (shadow
 * students, invites) — deleting only the profile leaves the account behind.
 */
export async function purgeAccountsByToken(token: string | number): Promise<void> {
  const db = adminClient();
  const needle = assertToken(token).toLowerCase();
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`purge accounts ~ ${token}: ${error.message}`);
    for (const user of data.users) {
      if (!user.email?.toLowerCase().includes(needle)) continue;
      const { error: deleteError } = await db.auth.admin.deleteUser(user.id);
      if (deleteError) throw new Error(`purge account ${user.email}: ${deleteError.message}`);
    }
    if (data.users.length < 1000) break;
  }
  await purgeByToken('profiles', 'email', token);
}

/** Rows a signed-in role account's actions wrote since `since` (chat threads, quiz state). */
export async function purgeOwnedSince(
  table: string,
  ownerColumn: string,
  ownerId: string,
  since: Date
): Promise<void> {
  const { error } = await adminClient()
    .from(table)
    .delete()
    .eq(ownerColumn, ownerId)
    .gte('created_at', since.toISOString());
  if (error) throw new Error(`purge ${table} of ${ownerId}: ${error.message}`);
}
