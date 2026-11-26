/**
 * Reads a whole table through PostgREST's response cap (`max_rows = 1000`): one `range` page at a time until a short
 * page. `page` must carry a stable `order`, or rows can repeat or go missing between pages.
 */

export const PAGE_SIZE = 1000;
const MAX_PAGES = 50;

type PageResult<T> = { data: T[] | null; error: { message?: string } | null };

export async function fetchPaged<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<{ rows: T[]; error: { message?: string } | null }> {
  const rows: T[] = [];
  for (let index = 0; index < MAX_PAGES; index++) {
    const from = index * PAGE_SIZE;
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) return { rows: [], error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return { rows, error: null };
}
