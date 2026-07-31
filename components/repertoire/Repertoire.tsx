import { getTranslations } from 'next-intl/server';

import { DataList, type DataListColumn } from '@/components/shared/DataList';
import type { StudentRepertoireWithSong } from '@/types/StudentRepertoire';

import { RepertoireRow } from './RepertoireRow';

interface RepertoireProps {
  entries: StudentRepertoireWithSong[];
  /** True when the viewer owns this repertoire (student self-edit notes/difficulty). */
  canEdit: boolean;
}

/** Title · Author · Stage · Last practised · notes toggle. */
const TEMPLATE = '1fr 200px 120px 130px 110px';

/**
 * Repertoire surface (spec 05) — a scannable table on the shared DataList
 * primitive, so it reads like the Song Library rather than its own thing.
 *
 * It previously rendered a full editor card per entry, so 31 songs meant 31
 * open textareas and 31 hydrated client components stacked down the page.
 * Notes and difficulty now sit behind a per-row toggle; nothing was removed.
 */
export async function Repertoire({ entries, canEdit }: RepertoireProps) {
  const t = await getTranslations('Repertoire');
  const tSongs = await getTranslations('Songs');

  const columns: DataListColumn[] = [
    { label: tSongs('colTitle') },
    { label: tSongs('colAuthor') },
    { label: t('colStage') },
    { label: t('colLastPracticed'), align: 'right' },
    { label: '' },
  ];

  return (
    // Page shell mirrors SongsList so the two surfaces sit at the same width,
    // padding and background — the point of the exercise.
    <div
      style={{
        background: 'var(--ivory)',
        color: 'var(--ink)',
        fontSize: 13,
        lineHeight: 1.4,
        minHeight: '100%',
        padding: '28px 32px 64px',
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <h1
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 30,
            fontWeight: 500,
            fontStyle: 'italic',
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          {t('pageTitle')}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 4 }}>
          {t(entries.length === 1 ? 'subtitleSingular' : 'subtitlePlural', {
            count: entries.length,
          })}
        </p>
      </div>

      <DataList columns={columns} template={TEMPLATE} empty={t('emptyState')}>
        {entries.map((entry) => (
          <RepertoireRow key={entry.id} entry={entry} canEdit={canEdit} template={TEMPLATE} />
        ))}
      </DataList>
    </div>
  );
}
