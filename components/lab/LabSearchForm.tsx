import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  action: string;
  q: string;
  /** Other filters of the listing, kept when a new search is submitted. */
  hidden?: Record<string, string>;
};

/** Plain GET form: the query lives in the URL, so every search is a shareable, reloadable page. */
export async function LabSearchForm({ action, q, hidden = {} }: Props) {
  const t = await getTranslations('Lab');
  return (
    <form action={action} method="get" role="search" className="flex flex-wrap items-center gap-2">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <label htmlFor="lab-q" className="sr-only">
        {t('searchLabel')}
      </label>
      <Input
        id="lab-q"
        name="q"
        defaultValue={q}
        placeholder={t('searchPlaceholder')}
        className="w-full max-w-md"
      />
      <Button type="submit" size="sm">
        {t('searchButton')}
      </Button>
      {q && (
        <Button asChild variant="ghost" size="sm">
          <Link href={action}>{t('clear')}</Link>
        </Button>
      )}
    </form>
  );
}
