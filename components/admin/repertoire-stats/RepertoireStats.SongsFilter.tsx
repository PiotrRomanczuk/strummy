'use client';

import { useTranslations } from 'next-intl';

import { Input } from '@/components/ui/input';

type Props = {
  query: string;
  onQuery: (query: string) => void;
  category: string;
  onCategory: (category: string) => void;
  categories: string[];
  shown: number;
  total: number;
};

/** Text and category filters above the songs table, with how many songs pass them. */
export function RepertoireStatsSongsFilter(props: Props) {
  const t = useTranslations('RepertoireStats');
  return (
    <div className="flex flex-wrap gap-2">
      <Input
        value={props.query}
        onChange={(event) => props.onQuery(event.target.value)}
        placeholder={t('filter')}
        aria-label={t('filter')}
        className="max-w-xs"
      />
      <select
        value={props.category}
        onChange={(event) => props.onCategory(event.target.value)}
        aria-label={t('categoryFilter')}
        className="rounded-md border bg-background px-2 text-sm"
      >
        <option value="">{t('allCategories')}</option>
        {props.categories.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <p className="self-center text-xs text-muted-foreground">
        {t('songsShown', { count: props.shown, total: props.total })}
      </p>
    </div>
  );
}
