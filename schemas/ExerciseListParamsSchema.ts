import * as z from 'zod';

import { EXERCISE_KINDS, EXERCISE_NAME_MAX } from './SongExerciseSchema';

/** How many exercises one page of the library shows (#1213). */
export const EXERCISES_PAGE_SIZE = 25;

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);
const blankToUndefined = (value: unknown) => {
  const one = first(value);
  return typeof one === 'string' && one.trim() === '' ? undefined : one;
};

/**
 * The library's address (`/dashboard/exercises?kind=riff&song=<id>&q=intro&page=2`) as a typed filter. A value that
 * does not fit is dropped rather than failing the page: a stale or hand-edited link still shows the library.
 */
export const ExerciseListParamsSchema = z.object({
  kind: z.preprocess(blankToUndefined, z.enum(EXERCISE_KINDS).optional().catch(undefined)),
  song: z.preprocess(blankToUndefined, z.string().uuid().optional().catch(undefined)),
  q: z.preprocess(
    blankToUndefined,
    z.string().trim().max(EXERCISE_NAME_MAX).optional().catch(undefined)
  ),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(10_000).catch(1)),
});

export type ExerciseListParams = z.infer<typeof ExerciseListParamsSchema>;

/** Parses the page's search params; never throws. */
export function parseExerciseListParams(
  params: Record<string, string | string[] | undefined>
): ExerciseListParams {
  return ExerciseListParamsSchema.parse(params);
}

/** The library's address for a filter; the page is left out when it is the first. */
export function exerciseListHref(params: Partial<ExerciseListParams>): string {
  const query = new URLSearchParams();
  if (params.kind) query.set('kind', params.kind);
  if (params.song) query.set('song', params.song);
  if (params.q) query.set('q', params.q);
  if (params.page && params.page > 1) query.set('page', String(params.page));
  const search = query.toString();
  return search ? `/dashboard/exercises?${search}` : '/dashboard/exercises';
}
