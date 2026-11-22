import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { MISMATCH_FIELDS, MISMATCH_REASONS } from '@/lib/repertoire-stats/mismatches';
import { mismatchListOf, type MismatchRow } from '@/lib/repertoire-stats/mismatch-list';
import type { RepertoireSong } from '@/lib/repertoire-stats/repertoire-song';

import { MISMATCH_COLUMNS, RepertoireStatsMismatchRow } from './RepertoireStats.MismatchRow';
import { CardHead, StatsLabel } from './RepertoireStatsPrimitives';
import { statsHref, type StatsParams } from './repertoire-stats.helpers';

type Props = { songs: RepertoireSong[]; params: StatsParams };

/** Rows rendered before the rest folds away. */
const SHOWN = 20;

const pill = (isActive: boolean) =>
  `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] ${
    isActive
      ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
      : 'border-[var(--rule)] bg-[var(--card)] text-[var(--ink-3)] hover:border-[var(--ink-5)]'
  }`;

async function Rows({ rows, params }: { rows: MismatchRow[]; params: StatsParams }) {
  const t = await getTranslations('RepertoireStats');
  const head = ['song', 'field', 'values', 'verdict'] as const;
  const row = (entry: MismatchRow) => (
    <RepertoireStatsMismatchRow
      key={`${entry.song.id}-${entry.mismatch.field}`}
      song={entry.song}
      mismatch={entry.mismatch}
      names={params.names}
    />
  );
  return (
    <>
      <div className={`hidden gap-x-4 px-5 pb-2.5 md:grid ${MISMATCH_COLUMNS}`}>
        {head.map((column) => (
          <StatsLabel key={column}>{t(`mismatches.column.${column}`)}</StatsLabel>
        ))}
      </div>
      {rows.slice(0, SHOWN).map(row)}
      {rows.length > SHOWN && (
        <details className="group">
          <summary className="min-h-11 cursor-pointer list-none border-t border-[var(--rule-2)] px-5 py-3 text-[var(--gold-2)] group-open:hidden">
            {t('mismatches.showRest', { count: rows.length - SHOWN })}
          </summary>
          {rows.slice(SHOWN).map(row)}
        </details>
      )}
    </>
  );
}

/** "Where is Strummy wrong?": errors to fix first, explained disagreements muted below. */
export async function RepertoireStatsMismatches({ songs, params }: Props) {
  const t = await getTranslations('RepertoireStats.mismatches');
  const list = mismatchListOf(songs, params.field);
  const all = mismatchListOf(songs, null);
  const filters = [
    { field: null, count: all.total },
    ...MISMATCH_FIELDS.map((field) => ({ field, count: all.perField[field] })),
  ];
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label={t('filter')}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0"
        >
          {filters.map(({ field, count }) => (
            <Link
              key={field ?? 'all'}
              href={statsHref(params, { field })}
              aria-current={params.field === field ? 'true' : undefined}
              className={pill(params.field === field)}
            >
              {t(`type.${field ?? 'all'}`)}
              <span className="font-mono text-[11px] opacity-70">{count}</span>
            </Link>
          ))}
        </nav>
        <span className="text-[12.5px] text-[var(--ink-3)]">{t('order')}</span>
      </div>
      <section className="mb-5 rounded-[10px] border border-[var(--rule)] bg-[var(--card)] pt-5">
        <div className="px-4 md:px-5">
          <CardHead
            title={t('errorsTitle')}
            sub={t('errorsSub')}
            right={
              <SongTotal count={list.errorSongs} label={t('songs', { count: list.errorSongs })} />
            }
          />
        </div>
        {list.errors.length ? (
          <Rows rows={list.errors} params={params} />
        ) : (
          <Empty text={t('noErrors')} />
        )}
      </section>
      <section className="rounded-[10px] border border-[var(--rule)] bg-[var(--paper)] pt-5">
        <div className="px-4 md:px-5">
          <CardHead
            title={<span className="text-[var(--ink-2)]">{t('explainedTitle')}</span>}
            sub={t('explainedSub')}
            right={
              <SongTotal
                count={list.explainedSongs}
                label={t('songs', { count: list.explainedSongs })}
                isMuted
              />
            }
          />
          <div className="mb-4 flex flex-wrap gap-1.5">
            {MISMATCH_REASONS.filter((reason) => list.perReason[reason] > 0).map((reason) => (
              <span
                key={reason}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--rule)] px-2 py-0.5 text-[11.5px] text-[var(--ink-3)]"
              >
                {t(`reasonCount.${reason}`)}
                <span className="font-mono">{list.perReason[reason]}</span>
              </span>
            ))}
          </div>
        </div>
        {list.explained.length ? (
          <Rows rows={list.explained} params={params} />
        ) : (
          <Empty text={t('noExplained')} />
        )}
      </section>
    </div>
  );
}

function SongTotal({ count, label, isMuted }: { count: number; label: string; isMuted?: boolean }) {
  return (
    <span className={`font-serif text-[26px] font-medium ${isMuted ? 'text-[var(--ink-3)]' : ''}`}>
      {count} <span className="font-sans text-[13px] font-normal text-[var(--ink-3)]">{label}</span>
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="border-t border-[var(--rule-2)] px-5 py-6 text-center text-[var(--ink-3)]">
      {text}
    </p>
  );
}
