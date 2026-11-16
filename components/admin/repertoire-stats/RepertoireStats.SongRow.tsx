import Link from 'next/link';
import { Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { nameNotes, type NoteNaming } from '@/lib/music-theory/note-naming';
import { chordShare } from '@/lib/repertoire-stats/chord-agreement';
import { fieldMarksOf, type FieldMark } from '@/lib/repertoire-stats/mismatch-list';
import { formatDuration } from '@/lib/repertoire-stats/mismatches';
import type { RepertoireSong } from '@/lib/repertoire-stats/repertoire-song';

import { CoverageIcons, MarkIcon } from './RepertoireStatsPrimitives';
import { MAX_COMPARE, statsHref, toggleId, type StatsParams } from './repertoire-stats.helpers';

export const SONG_COLUMNS =
  'md:grid-cols-[28px_minmax(0,1fr)_64px_70px_58px_40px_50px_50px_56px_36px_36px_44px_58px_56px_44px]';

type Props = { song: RepertoireSong; params: StatsParams };

const capoText = (fret: number | null | undefined) => (fret ? String(fret) : '–');

function Pair({
  entered,
  measured,
  mark,
  markLabel,
  label,
}: {
  entered: string;
  measured: string | null;
  mark: FieldMark;
  markLabel: string;
  label: string;
}) {
  const isOff = mark !== null && mark !== 'ok';
  return (
    <>
      <div className="flex justify-between gap-2 font-mono md:block md:text-right">
        <span className="font-sans text-[12px] text-[var(--ink-3)] md:hidden">{label}</span>
        {entered}
      </div>
      <div
        className={`flex items-center justify-end gap-1 font-mono ${isOff ? 'font-medium' : ''}`}
      >
        {measured === null ? (
          <span className="text-[var(--ink-5)]">–</span>
        ) : (
          <>
            {isOff && <MarkIcon mark={mark} label={markLabel} />}
            {measured}
          </>
        )}
      </div>
    </>
  );
}

/** Strummy's value and the recording's for tempo, key, capo (suggested) and length. */
function pairsOf(song: RepertoireSong, marks: ReturnType<typeof fieldMarksOf>, naming: NoteNaming) {
  const { entered, measured } = song;
  const names = (label: string | null | undefined) => (label ? nameNotes(label, naming) : '–');
  const duration = (ms: number | null | undefined) => (ms ? formatDuration(ms) : null);
  return [
    {
      field: 'tempo',
      entered: entered.tempo ? String(entered.tempo) : '–',
      measured: measured?.bpm ? String(Math.round(measured.bpm)) : null,
      mark: marks.tempo,
    },
    {
      field: 'key',
      entered: names(entered.key),
      measured: measured?.key ? names(measured.key) : null,
      mark: marks.key,
    },
    {
      field: 'capo',
      entered: capoText(entered.capo),
      measured: measured ? capoText(measured.suggestedCapo) : null,
      mark: null,
    },
    {
      field: 'duration',
      entered: duration(entered.durationMs) ?? '–',
      measured: duration(measured?.durationMs),
      mark: marks.duration,
    },
  ];
}

/** One song of the table: Strummy beside the recording for tempo, key, capo and length. */
export async function RepertoireStatsSongRow({ song, params }: Props) {
  const t = await getTranslations('RepertoireStats');
  const marks = fieldMarksOf(song);
  const { entered, measured } = song;
  const isCompared = params.compare.includes(song.id);
  const share = measured ? chordShare(entered.chords, entered.capo, measured.chords) : null;
  const markLabel = (mark: FieldMark) => (mark ? t(`mark.${mark}`) : '');
  const level = song.level && t.has(`level.${song.level}`) ? t(`level.${song.level}`) : song.level;
  const pairs = pairsOf(song, marks, params.names);
  return (
    <div
      className={`grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-[var(--rule-2)] px-4 py-2.5 md:min-h-[46px] md:py-1.5 ${SONG_COLUMNS} ${isCompared ? 'bg-[var(--paper)]' : ''}`}
    >
      <Link
        href={statsHref(params, { compare: toggleId(params.compare, song.id, MAX_COMPARE) })}
        scroll={false}
        aria-label={t(isCompared ? 'songs.uncompare' : 'songs.compare', { title: song.title })}
        className={`grid size-4 place-items-center rounded border-[1.5px] ${isCompared ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]' : 'border-[var(--ink-5)] bg-[var(--card)]'}`}
      >
        {isCompared && <Check aria-hidden className="size-3" strokeWidth={3} />}
      </Link>
      <div className="min-w-0">
        <Link
          href={`/dashboard/songs/${song.id}`}
          className="block truncate font-medium text-[var(--ink)]"
        >
          {song.title}
        </Link>
        <div className="truncate text-[12px] text-[var(--ink-3)]">{song.author}</div>
      </div>
      <span className="text-right font-mono text-[12px] md:order-last">{song.students}</span>
      <div className="col-span-3 flex flex-wrap gap-x-3 text-[12px] text-[var(--ink-3)] md:contents">
        <span className="truncate">{song.category ?? '–'}</span>
        <span className="truncate">{level ?? '–'}</span>
        <CoverageIcons
          has={[song.hasLink, !!measured, !!song.transcription]}
          labels={[t('coverage.link'), t('coverage.analysis'), t('coverage.transcription')]}
        />
      </div>
      <div className="col-span-3 grid grid-cols-2 gap-x-3 md:contents">
        {pairs.map((pair) => (
          <Pair
            key={pair.field}
            label={t(`field.${pair.field}`)}
            markLabel={markLabel(pair.mark)}
            {...pair}
          />
        ))}
      </div>
      <div className="col-span-3 flex items-center justify-between gap-1 font-mono md:col-span-1 md:justify-end">
        <span className="font-sans text-[12px] text-[var(--ink-3)] md:hidden">
          {t('field.chords')}
        </span>
        {share === null ? (
          <span className="text-[var(--ink-5)]">–</span>
        ) : (
          <span className="inline-flex items-center gap-1">
            {marks.chords !== 'ok' && (
              <MarkIcon mark={marks.chords} label={markLabel(marks.chords)} />
            )}
            {Math.round(share * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}
