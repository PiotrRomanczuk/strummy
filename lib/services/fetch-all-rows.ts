// PostgREST caps an unranged select at this many rows (Supabase default
// max-rows). A query that scans a whole table to build counts or pick ids must not stop there:
// past this size a plain `select()` silently drops the tail — including,
// nondeterministically, whichever row a fresh insert happens to land in. Page
// through with `.range()` until a page comes back short.
const MAX_ROWS_PER_PAGE = 1000;

/** Every row of a query, a page at a time. */
export async function fetchAllRows<T>(
  fetchPage: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  errorContext: string
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await fetchPage(from, from + MAX_ROWS_PER_PAGE - 1);
    if (error) {
      throw new Error(`${errorContext}: ${error.message}`);
    }
    rows.push(...(data ?? []));
    if (!data || data.length < MAX_ROWS_PER_PAGE) break;
    from += MAX_ROWS_PER_PAGE;
  }
  return rows;
}
