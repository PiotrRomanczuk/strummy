export class AssertError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertError';
  }
}

type SupaResult<T> = {
  data: T | null;
  error: { message: string; code?: string } | null;
};

/**
 * Asserts a Supabase response came back with no error AND a non-empty result.
 * Use for operations expected to PASS RLS.
 */
export function expectAllowed<T>(res: SupaResult<T>, what: string): T {
  if (res.error) throw new AssertError(`${what}: expected allow, got error: ${res.error.message}`);
  if (res.data === null) throw new AssertError(`${what}: expected data, got null`);
  if (Array.isArray(res.data) && res.data.length === 0) {
    throw new AssertError(`${what}: expected non-empty array, got []`);
  }
  return res.data;
}

/**
 * Asserts a Supabase response was denied — either error returned, or empty
 * result (RLS SELECT denies silently by filtering rows out).
 */
export function expectDenied(res: SupaResult<unknown>, what: string): void {
  if (res.error) return; // explicit RLS error counts as denied
  const isEmpty = res.data === null || (Array.isArray(res.data) && res.data.length === 0);
  if (!isEmpty) {
    throw new AssertError(
      `${what}: expected deny (error or empty), got data: ${JSON.stringify(res.data).slice(0, 120)}`
    );
  }
}
