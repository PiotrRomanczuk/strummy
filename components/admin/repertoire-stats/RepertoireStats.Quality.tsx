import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { QualityBand } from '@/lib/data-quality/quality.types';
import { CONFIDENT } from '@/lib/song-suggestions/fields';
import {
  AI_RULE,
  FILL_RULE,
  fillCountsOf,
  qualityRowsOf,
  type QualityReportInput,
  type QualityRow,
} from '@/lib/repertoire-stats/quality-list';
import type { RepertoireSong } from '@/lib/repertoire-stats/repertoire-song';
import { TABLE_PAGE } from '@/lib/repertoire-stats/songs-table';

import { RepertoireStatsBulkActions } from './RepertoireStats.BulkActions';
import { RepertoireStatsFixQueue } from './RepertoireStats.FixQueue';
import { RepertoireStatsQualityRow } from './RepertoireStats.QualityRow';
import { CardHead, StatsCard, StatsLabel } from './RepertoireStatsPrimitives';
import { statsHref, type StatsParams } from './repertoire-stats.helpers';
import type { Translate } from './repertoire-stats.i18n';

type Props = { songs: RepertoireSong[]; report: QualityReportInput; params: StatsParams };

const BANDS: [QualityBand, string][] = [
  ['good', 'bandGood'],
  ['fair', 'bandFair'],
  ['poor', 'bandPoor'],
];

function Tile({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <StatsCard className="p-4 md:p-5">
      <StatsLabel>{label}</StatsLabel>
      <div className="mt-1.5 font-serif text-[30px] font-medium leading-none">{value}</div>
      <div className="mt-1.5 text-[12.5px] text-[var(--ink-3)]">{sub}</div>
    </StatsCard>
  );
}

/**
 * "Is the song data right?": the quality score of every song — its own fields and its agreement with the recording
 * — the fix queue, and the songs to fix with the values their recording can fill in.
 */
export async function RepertoireStatsQuality({ songs, report, params }: Props) {
  const [t, dq] = await Promise.all([
    getTranslations('RepertoireStats.quality'),
    getTranslations('DataQuality'),
  ]);
  const { quality } = report;
  const fill = fillCountsOf(report.suggestions);
  const rows = qualityRowsOf(report, songs, params.rule);
  const percent = (count: number) =>
    quality.total ? Math.round((100 * count) / quality.total) : 0;
  const ai = [...(report.ai?.values() ?? [])];
  const confidentAi = ai.flat().filter((s) => s.confidence >= CONFIDENT).length;
  const ruleName = (rule: string) =>
    rule === FILL_RULE ? t('fillRule') : rule === AI_RULE ? t('aiRule') : dq(`rules.${rule}.label`);
  const title = params.rule ? t('songsFiltered', { rule: ruleName(params.rule) }) : t('songsTitle');
  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-5">
        <Tile
          label={dq('averageScore')}
          value={quality.averageScore}
          sub={t('songs', { count: quality.total })}
        />
        {BANDS.map(([band, key]) => (
          <Tile
            key={band}
            label={dq(key)}
            value={quality.bands[band]}
            sub={`${percent(quality.bands[band])}%`}
          />
        ))}
        <Tile
          label={t('fillTile')}
          value={fill.values}
          sub={t('fillTileSub', { count: fill.songs })}
        />
      </div>
      <RepertoireStatsBulkActions fillValues={fill.values} confidentAi={confidentAi} />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <RepertoireStatsFixQueue
          rules={quality.fixQueue}
          fillSongs={fill.songs}
          aiSongs={ai.length}
          params={params}
        />
        <SongsCard rows={rows} title={title} params={params} t={t} />
      </div>
    </div>
  );
}

/** The songs to fix, paged like the songs table. */
function SongsCard({
  rows,
  title,
  params,
  t,
}: {
  rows: QualityRow[];
  title: string;
  params: StatsParams;
  t: Translate;
}) {
  const shown = rows.slice(0, params.limit);
  const clear = params.rule && (
    <Link href={statsHref(params, { rule: null, limit: 0 })} className="text-[var(--gold-2)]">
      {t('clearFilter')}
    </Link>
  );
  return (
    <StatsCard className="pt-5">
      <div className="px-4 md:px-5">
        <CardHead title={title} sub={t('songsHint')} right={clear} />
      </div>
      <ul>
        {shown.map((row) => (
          <RepertoireStatsQualityRow
            key={row.song.id}
            song={row.song}
            quality={row.quality}
            suggestions={row.suggestions}
            ai={row.ai}
            names={params.names}
          />
        ))}
      </ul>
      {rows.length === 0 && (
        <p className="border-t border-[var(--rule-2)] px-5 py-6 text-center text-[var(--ink-3)]">
          {t('empty')}
        </p>
      )}
      <div className="flex flex-wrap justify-between gap-2 border-t border-[var(--rule-2)] px-4 py-3 text-[var(--ink-3)] md:px-5">
        <span>{t('footer', { shown: shown.length, total: rows.length })}</span>
        {shown.length < rows.length && (
          <Link
            href={statsHref(params, { limit: params.limit + TABLE_PAGE })}
            scroll={false}
            className="text-[var(--gold-2)]"
          >
            {t('more', { count: Math.min(TABLE_PAGE, rows.length - shown.length) })}
          </Link>
        )}
      </div>
    </StatsCard>
  );
}
