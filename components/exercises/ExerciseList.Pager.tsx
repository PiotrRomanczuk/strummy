import Link from 'next/link';
import { useTranslations } from 'next-intl';

import {
  EXERCISES_PAGE_SIZE,
  exerciseListHref,
  type ExerciseListParams,
} from '@/schemas/ExerciseListParamsSchema';

const step =
  'inline-flex h-9 items-center rounded-lg border border-[var(--rule)] bg-[var(--card)] px-3 text-[13px] text-[var(--ink-2)] no-underline';

/** "Previous · page 2 of 11 · Next", keeping the filter; gone when everything fits on one page. */
export const ExercisePager = ({ params, total }: { params: ExerciseListParams; total: number }) => {
  const t = useTranslations('Exercises');
  const pages = Math.ceil(total / EXERCISES_PAGE_SIZE);
  if (pages <= 1) return null;
  const page = Math.min(params.page, pages);

  return (
    <nav aria-label={t('pagesLabel')} className="flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={exerciseListHref({ ...params, page: page - 1 })} className={step} rel="prev">
          {t('previous')}
        </Link>
      ) : (
        <span />
      )}
      <span className="font-mono text-[11.5px] text-[var(--ink-4)]">
        {t('pageOf', { page, pages })}
      </span>
      {page < pages ? (
        <Link href={exerciseListHref({ ...params, page: page + 1 })} className={step} rel="next">
          {t('next')}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
};
