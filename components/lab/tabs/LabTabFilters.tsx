import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { TAB_KINDS, type TabKind } from './lab-tabs.helpers';

type Choice = { name: string; value: string; options: string[] };

type Props = {
  action: string;
  q: string;
  kind: TabKind;
  choices: Choice[];
};

const SELECT = 'h-9 rounded-md border bg-background px-2 text-sm dark:bg-input/30';

/** GET form over the tab library: text, songs vs exercises, tuning, instrument, exercise topic. */
export async function LabTabFilters({ action, q, kind, choices }: Props) {
  const t = await getTranslations('Lab.tabs');
  const isFiltered = q || kind !== 'all' || choices.some((choice) => choice.value);
  return (
    <form action={action} method="get" role="search" className="flex flex-wrap items-center gap-2">
      <label htmlFor="lab-tabs-q" className="sr-only">
        {t('searchLabel')}
      </label>
      <Input id="lab-tabs-q" name="q" defaultValue={q} placeholder={t('searchPlaceholder')} className="max-w-sm" />
      <label className="sr-only" htmlFor="lab-tabs-kind">
        {t('kindLabel')}
      </label>
      <select id="lab-tabs-kind" name="kind" defaultValue={kind} className={SELECT}>
        {TAB_KINDS.map((value) => (
          <option key={value} value={value}>
            {t(`kind.${value}`)}
          </option>
        ))}
      </select>
      {choices.map((choice) => (
        <label key={choice.name} className="flex items-center gap-1 text-sm">
          <span className="sr-only">{t(`filter.${choice.name}`)}</span>
          <select name={choice.name} defaultValue={choice.value} className={SELECT}>
            <option value="">{t(`filter.${choice.name}`)}</option>
            {choice.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ))}
      <Button type="submit" size="sm">
        {t('apply')}
      </Button>
      {isFiltered && (
        <Button asChild variant="ghost" size="sm">
          <Link href={action}>{t('clear')}</Link>
        </Button>
      )}
    </form>
  );
}
