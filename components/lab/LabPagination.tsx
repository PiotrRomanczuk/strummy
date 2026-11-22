import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';

import { pageHref } from './lab.helpers';

type Props = {
  basePath: string;
  params: Record<string, string>;
  page: number;
  pageSize: number;
  total: number;
};

export async function LabPagination({ basePath, params, page, pageSize, total }: Props) {
  const t = await getTranslations('Lab');
  const pages = Math.max(Math.ceil(total / pageSize), 1);
  return (
    <nav className="flex items-center justify-between gap-4 text-sm" aria-label={t('pageOf', { page, pages })}>
      <span className="text-muted-foreground">
        {t('results', { count: total })} · {t('pageOf', { page, pages })}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Button asChild variant="outline" size="sm">
            <Link href={pageHref(basePath, { ...params, page: page - 1 })}>{t('previous')}</Link>
          </Button>
        )}
        {page < pages && (
          <Button asChild variant="outline" size="sm">
            <Link href={pageHref(basePath, { ...params, page: page + 1 })}>{t('next')}</Link>
          </Button>
        )}
      </div>
    </nav>
  );
}
