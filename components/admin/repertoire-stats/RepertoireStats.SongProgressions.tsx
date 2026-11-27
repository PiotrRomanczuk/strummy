import { Fragment } from 'react';
import { getTranslations } from 'next-intl/server';

import type { RepertoireSong } from '@/lib/repertoire-stats/repertoire-song';
import {
  compareProgressions,
  type ProgressionComparison,
  type ProgressionStatus,
  type SongDetail,
} from '@/lib/repertoire-stats/song-progressions';

import { RepertoireStatsSectionBar } from './RepertoireStats.SectionBar';
import { ChordList, Degrees, StatsLabel, StatusText } from './RepertoireStatsPrimitives';
import type { StatsParams } from './repertoire-stats.helpers';
import { keyLabel, type Translate } from './repertoire-stats.i18n';

type Props = { song: RepertoireSong; detail: SongDetail | null; params: StatsParams };

const STATUS_MARK: Record<ProgressionStatus, 'ok' | 'review' | 'explained'> = {
  match: 'ok',
  reordered: 'review',
  unordered: 'review',
  recordingOnly: 'explained',
};

function StrummySide({
  row,
  params,
  t,
}: {
  row: ProgressionComparison;
  params: StatsParams;
  t: Translate;
}) {
  if (row.status === 'recordingOnly')
    return <span className="text-[var(--ink-4)]">{t('progressions.notInStrummy')}</span>;
  const body = (
    <>
      <Degrees roman={row.roman} />
      <div className="mt-1.5">
        <ChordList chords={row.strummy} names={params.names} />
      </div>
    </>
  );
  return row.status === 'match' ? (
    body
  ) : (
    <div className="rounded-lg border border-dashed border-[var(--ink-5)] p-2.5">{body}</div>
  );
}

/** One song: each progression of the recording against Strummy's chords, then the recording's sections. */
export async function RepertoireStatsSongProgressions({ song, detail, params }: Props) {
  const t = await getTranslations('RepertoireStats');
  const rows = compareProgressions(song, detail?.sheet ?? null);
  const sections = detail?.sections ?? [];
  const totalBars = sections.reduce((sum, section) => sum + section.bars, 0);
  return (
    <div>
      <h2 className="font-serif text-[20px] font-medium">{t('progressions.compareTitle')}</h2>
      <div className="mb-3 mt-1 text-[var(--ink-3)]">
        {t(detail?.sheet ? 'progressions.fromSheet' : 'progressions.fromList')}
      </div>
      {rows.length === 0 ? (
        <p className="text-[var(--ink-3)]">{t('progressions.noneHeard')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_170px]">
          <StatsLabel className="pb-2">
            {t(detail?.sheet ? 'progressions.strummySheet' : 'progressions.strummyList')}
          </StatsLabel>
          <StatsLabel className="pb-2">{t('side.recording')}</StatsLabel>
          <StatsLabel className="hidden pb-2 md:block">{t('progressions.agreement')}</StatsLabel>
          {rows.map((row, i) => (
            <Fragment key={i}>
              <div className="border-t border-[var(--rule-2)] py-3">
                <StrummySide row={row} params={params} t={t} />
              </div>
              <div className="border-t border-[var(--rule-2)] py-3">
                <Degrees roman={row.roman} />
                <div className="mt-1.5">
                  <ChordList chords={row.heard} names={params.names} />
                </div>
                <div className="mt-1.5 font-mono text-[11.5px] text-[var(--ink-3)]">
                  {t('progressions.bars', { count: row.bars })}
                </div>
              </div>
              <div className="col-span-2 pb-3 md:col-span-1 md:border-t md:border-[var(--rule-2)] md:py-3">
                <StatusText mark={STATUS_MARK[row.status]}>
                  {t(`progressions.status.${row.status}`)}
                </StatusText>
              </div>
            </Fragment>
          ))}
        </div>
      )}
      {sections.length > 0 && (
        <>
          <div className="mb-3 mt-6 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-[20px] font-medium">
              {t('progressions.sectionsTitle')}
            </h2>
            <span className="font-mono text-[12px] text-[var(--ink-3)]">
              {t('progressions.sectionsSummary', { sections: sections.length, bars: totalBars })}
              {song.measured?.key ? ` · ${keyLabel(song.measured.key, params.names, t)}` : ''}
            </span>
          </div>
          <RepertoireStatsSectionBar
            sections={sections}
            names={params.names}
            barsLabel={(count) => t('progressions.bars', { count })}
          />
        </>
      )}
    </div>
  );
}
