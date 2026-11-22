import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  action: string;
  q: string;
  has: string[];
  sort: 'sources' | 'name';
  /** Source id → label, in display order. */
  sources: [string, string][];
};

/** GET form: free text, "must appear in" sources (AND) and the sort — all in the URL. */
export async function LabSongFilters({ action, q, has, sort, sources }: Props) {
  const t = await getTranslations('Lab.songs');
  return (
    <form action={action} method="get" role="search" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="lab-songs-q" className="sr-only">
          {t('searchLabel')}
        </label>
        <Input id="lab-songs-q" name="q" defaultValue={q} placeholder={t('searchPlaceholder')} className="max-w-md" />
        <label htmlFor="lab-songs-sort" className="sr-only">
          {t('sortLabel')}
        </label>
        <select
          id="lab-songs-sort"
          name="sort"
          defaultValue={sort}
          className="h-9 rounded-md border bg-background px-2 text-sm dark:bg-input/30"
        >
          <option value="sources">{t('sortSources')}</option>
          <option value="name">{t('sortName')}</option>
        </select>
        <Button type="submit" size="sm">
          {t('apply')}
        </Button>
        {(q || has.length > 0) && (
          <Button asChild variant="ghost" size="sm">
            <Link href={action}>{t('clear')}</Link>
          </Button>
        )}
      </div>
      <fieldset className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <legend className="mb-1 text-xs text-muted-foreground">{t('hasLabel')}</legend>
        {sources.map(([id, label]) => (
          <label key={id} className="flex items-center gap-1.5">
            <input type="checkbox" name="has" value={id} defaultChecked={has.includes(id)} />
            {label}
          </label>
        ))}
      </fieldset>
    </form>
  );
}
