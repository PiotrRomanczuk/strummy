import Link from 'next/link';
import { ArrowRight, Pencil } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import type { NoteNaming } from '@/lib/music-theory/note-naming';
import { chordNames } from '@/lib/repertoire-stats/chord-agreement';
import type { Mismatch } from '@/lib/repertoire-stats/mismatches';
import { formatDuration } from '@/lib/repertoire-stats/mismatches';
import type { RepertoireSong } from '@/lib/repertoire-stats/repertoire-song';

import {
  ChordList,
  ReasonTag,
  StatsLabel,
  StatusText,
  StudentCount,
} from './RepertoireStatsPrimitives';
import { decimal, degreesOf, keyLabel, signed, type Translate } from './repertoire-stats.i18n';

type Props = { song: RepertoireSong; mismatch: Mismatch; names: NoteNaming };

export const MISMATCH_COLUMNS =
  'md:grid-cols-[minmax(0,220px)_86px_minmax(0,1fr)_minmax(0,250px)_130px]';

function ChordValues({ song, mismatch, names, t }: Props & { t: Translate }) {
  const entered = chordNames(song.entered.chords);
  const heard = song.measured?.chords ?? [];
  const shift = song.entered.capo + (mismatch.detail ?? 0);
  return (
    <div className="grid grid-cols-[64px_1fr] items-center gap-y-1.5">
      <StatsLabel>{t('side.strummy')}</StatsLabel>
      <ChordList chords={entered} degrees={degreesOf(song, entered, shift)} names={names} />
      <StatsLabel>{t('side.recording')}</StatsLabel>
      <ChordList chords={heard} degrees={degreesOf(song, heard, 0)} names={names} />
    </div>
  );
}

function Values({ song, mismatch, names, t }: Props & { t: Translate }) {
  if (mismatch.field === 'chords')
    return <ChordValues song={song} mismatch={mismatch} names={names} t={t} />;
  const pair: Record<Exclude<Mismatch['field'], 'chords'>, [string, string]> = {
    tempo: [t('bpm', { value: mismatch.entered }), t('bpm', { value: mismatch.measured })],
    key: [
      `${keyLabel(song.entered.key, names, t)}${song.entered.capo ? `, ${t('capo', { fret: song.entered.capo })}` : ''}`,
      keyLabel(song.measured?.key ?? null, names, t),
    ],
    duration: [mismatch.entered, mismatch.measured],
  };
  const [from, to] = pair[mismatch.field];
  return (
    <div className="flex flex-wrap items-center gap-2 font-mono">
      <span>{from}</span>
      <ArrowRight aria-hidden className="size-3.5 text-[var(--ink-4)]" />
      <span className="font-medium">{to}</span>
    </div>
  );
}

function verdictOf(mismatch: Mismatch, t: Translate, locale: string): string {
  const { field, reason, detail, share } = mismatch;
  const semitones = detail === null ? '' : signed(detail);
  if (reason === 'tuning' || reason === 'shifted') {
    return field === 'chords' && share
      ? t('verdict.chordsShifted', {
          before: Math.round(share.asEntered * 100),
          after: Math.round((share.shifted ?? 0) * 100),
          semitones,
        })
      : t('verdict.keyShifted', { semitones });
  }
  if (reason === 'lowConfidence')
    return t('verdict.lowConfidence', { strength: decimal(detail ?? 0, locale) });
  if (reason) return t(`verdict.${reason}`);
  if (field === 'tempo') return t('verdict.tempo', { percent: signed(detail ?? 0) });
  if (field === 'duration') {
    const delta = detail ?? 0;
    return t('verdict.duration', {
      delta: `${delta < 0 ? '−' : '+'}${formatDuration(Math.abs(delta))}`,
    });
  }
  if (field === 'chords')
    return t('verdict.chords', { percent: Math.round((share?.asEntered ?? 0) * 100) });
  return t('verdict.key');
}

/** One disagreement: the song, the field, Strummy → recording, the verdict and a way to fix it. */
export async function RepertoireStatsMismatchRow({ song, mismatch, names }: Props) {
  const [t, locale] = await Promise.all([getTranslations('RepertoireStats'), getLocale()]);
  const isExplained = mismatch.reason !== null;
  const verdict = verdictOf(mismatch, t, locale);
  return (
    <div
      className={`grid gap-x-4 gap-y-2.5 border-t border-[var(--rule-2)] px-4 py-3.5 md:items-center md:px-5 ${MISMATCH_COLUMNS} ${isExplained ? 'text-[var(--ink-3)]' : ''}`}
    >
      <div className="flex min-w-0 justify-between gap-2.5 md:block">
        <div className="min-w-0">
          <div
            className={`font-medium ${isExplained ? 'text-[var(--ink-2)]' : 'text-[var(--ink)]'}`}
          >
            {song.title}
          </div>
          <div className="flex gap-2 text-[12px] text-[var(--ink-3)]">
            <span>{song.author}</span>
            <StudentCount count={song.students} label={t('gaps.studentsHint')} />
          </div>
        </div>
        <StatsLabel className="md:hidden">{t(`field.${mismatch.field}`)}</StatsLabel>
      </div>
      <StatsLabel className="hidden md:block">{t(`field.${mismatch.field}`)}</StatsLabel>
      <Values song={song} mismatch={mismatch} names={names} t={t} />
      <div>
        {isExplained ? (
          <>
            <ReasonTag>{t(`reason.${mismatch.reason}`)}</ReasonTag>
            <div className="mt-1 text-[12px]">{verdict}</div>
          </>
        ) : (
          <StatusText mark="error">{verdict}</StatusText>
        )}
      </div>
      <Link
        href={`/dashboard/songs/${song.id}/edit`}
        className={`inline-flex min-h-11 items-center gap-1.5 md:min-h-0 md:justify-self-end ${isExplained ? 'text-[var(--ink-3)]' : 'text-[var(--gold-2)]'}`}
      >
        <Pencil aria-hidden className="size-3.5" />
        {t('editSong')}
      </Link>
    </div>
  );
}
