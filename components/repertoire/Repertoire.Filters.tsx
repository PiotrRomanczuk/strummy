import { getTranslations } from 'next-intl/server';

import { stageLabelKey, type StageKey } from '@/components/songs/SongPrimitives';
import { buildListHref } from '@/components/shared/list-filters.helpers';
import {
  FilterBar,
  FilterChipRow,
  FilterRow,
  type FilterChip,
} from '@/components/shared/ListFilters';
import { ListFiltersForm } from '@/components/shared/ListFilters.Form';

import {
  DEFAULT_SORT,
  SORTS,
  STAGES,
  type RepertoireFilters,
  type Stage,
} from './repertoire-filters.helpers';

const BASE_PATH = '/dashboard/repertoire';

const SORT_LABEL_KEYS: Record<(typeof SORTS)[number], string> = {
  recent: 'sortRecent',
  title: 'sortTitle',
  stage: 'sortStage',
};

type Props = {
  filters: RepertoireFilters;
  counts: Record<Stage, number>;
};

/**
 * Repertoire filter bar — stage chips, sort chips, and a title/author search.
 *
 * Chips are server-rendered links via the shared builder; only the search box
 * ships client JS. Same structure, same interaction and same styling as every
 * other list bar.
 */
export const RepertoireFiltersBar = async ({ filters, counts }: Props) => {
  const t = await getTranslations('Repertoire');
  const tSongs = await getTranslations('Songs');

  const current = { search: filters.search, stage: filters.stage, sort: filters.sort };
  const defaults = { sort: DEFAULT_SORT };
  const href = (next: Record<string, string | undefined>) =>
    buildListHref({ basePath: BASE_PATH, current, next, defaults });

  const stageChips: FilterChip[] = STAGES.map((stage) => {
    const isActive = filters.stage === stage;
    return {
      key: stage,
      // Clicking the active chip clears it — a filter row with no "all" chip
      // is otherwise a trap you can only escape via the URL.
      href: href({ stage: isActive ? undefined : stage }),
      label: tSongs(stageLabelKey(stage as StageKey)),
      isActive,
      count: counts[stage],
    };
  });

  const sortChips: FilterChip[] = SORTS.map((sort) => ({
    key: sort,
    href: href({ sort }),
    label: t(SORT_LABEL_KEYS[sort]),
    isActive: filters.sort === sort,
  }));

  return (
    <FilterBar>
      <FilterRow>
        <FilterChipRow label={t('filterStageLabel')} chips={stageChips} />
        <FilterChipRow chips={sortChips} align="end" />
      </FilterRow>

      <ListFiltersForm
        basePath={BASE_PATH}
        current={current}
        defaults={defaults}
        fields={[
          {
            kind: 'search',
            name: 'search',
            placeholder: t('searchPlaceholder'),
            ariaLabel: t('searchAriaLabel'),
            value: filters.search,
            grow: true,
          },
        ]}
      />
    </FilterBar>
  );
};
