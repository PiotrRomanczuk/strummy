import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Insert one fixture row with the service role and return its id. Throws on
 * any error, so a broken seed fails `beforeAll` loudly instead of leaving the
 * suite to assert against data that is not there.
 */
export async function seedRow(
  service: SupabaseClient,
  table: string,
  values: Record<string, unknown>
): Promise<string> {
  const { data, error } = await service.from(table).insert(values).select('id').single();
  if (error || !data) {
    throw new Error(`seed ${table} failed: ${error?.message ?? 'no row returned'}`);
  }
  return (data as { id: string }).id;
}

/** Update fixture rows by id with the service role; throws on any error. */
export async function updateRow(
  service: SupabaseClient,
  table: string,
  id: string,
  values: Record<string, unknown>
): Promise<void> {
  const { error } = await service.from(table).update(values).eq('id', id);
  if (error) throw new Error(`update ${table} ${id} failed: ${error.message}`);
}
