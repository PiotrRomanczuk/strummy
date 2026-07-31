'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { useHashtagSets } from './hooks/useHashtagSets';

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function HashtagSetPicker({ selectedIds, onChange }: Props) {
  const t = useTranslations('Songs');
  const { data: sets = [], isLoading } = useHashtagSets();

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  if (isLoading)
    return <p className="text-xs text-muted-foreground">{t('productionLoadingHashtagSets')}</p>;
  // Don't point at "Content → Hashtags" — no such screen exists. Sets are only
  // reachable through the API for now, so say what's actually true.
  if (sets.length === 0)
    return <p className="text-xs text-muted-foreground">{t('productionHashtagSetsEmpty')}</p>;

  return (
    <div className="flex flex-wrap gap-1.5">
      {sets.map((s) => {
        const active = selectedIds.includes(s.id);
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => toggle(s.id)}
            className="focus:outline-none focus:ring-2 focus:ring-ring rounded-full"
          >
            <Badge
              variant={active ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              title={s.hashtags.join(' ')}
            >
              {s.name}
              <span className="ml-1 text-[10px] opacity-70">{s.hashtags.length}</span>
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
