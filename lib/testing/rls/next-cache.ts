/**
 * `next/cache` for the RLS suites (mapped in jest.config.rls.ts). The real
 * `revalidatePath` throws outside a request; cache invalidation is Next's
 * business, not the database's, so here it only records the path.
 */
export const revalidatedPaths: string[] = [];

export function revalidatePath(path: string): void {
  revalidatedPaths.push(path);
}
