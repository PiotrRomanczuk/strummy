import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { QualityScorePill } from '@/components/data-quality/QualityScorePill';
import type { RecordQuality } from '@/lib/data-quality/quality.types';
import type { NoteNaming } from '@/lib/music-theory/note-naming';
import type { FillSuggestion } from '@/lib/repertoire-stats/fill';

import { RepertoireStatsFillButton } from './RepertoireStats.FillButton';
import { StudentCount } from './RepertoireStatsPrimitives';
import { keyLabel } from './repertoire-stats.i18n';

export type QualitySong = { id: string; title: string; author: string | null; students: number };
type Props = {
  song: QualitySong;
  quality: RecordQuality;
  suggestions: FillSuggestion[];
  names: NoteNaming;
};

/** One song to fix: its score, every rule it breaks, what the recording can fill in, and the edit link. */
export async function RepertoireStatsQualityRow({ song, quality, suggestions, names }: Props) {
  const [t, dq] = await Promise.all([
    getTranslations('RepertoireStats'),
    getTranslations('DataQuality'),
  ]);
  const shown = (suggestion: FillSuggestion) =>
    suggestion.field === 'tempo'
      ? t('bpm', { value: suggestion.value })
      : suggestion.field === 'key'
        ? keyLabel(suggestion.value, names, t)
        : suggestion.value;
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 border-t border-[var(--rule-2)] px-4 py-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:px-5">
      <span className="self-start">
        <QualityScorePill score={quality.score} band={quality.band} label={dq('badgeEyebrow')} />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link href={`/dashboard/songs/${song.id}`} className="font-medium text-[var(--ink)]">
            {song.title}
          </Link>
          <span className="text-[12px] text-[var(--ink-3)]">{song.author}</span>
          <StudentCount count={song.students} label={t('gaps.studentsHint')} />
        </div>
        {quality.failedRuleIds.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {quality.failedRuleIds.map((ruleId) => (
              <span
                key={ruleId}
                className="rounded border border-[var(--rule)] bg-[var(--paper)] px-1.5 text-[11.5px] text-[var(--ink-3)]"
              >
                {dq(`rules.${ruleId}.label`)}
              </span>
            ))}
          </div>
        )}
        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {suggestions.map((suggestion) => (
              <RepertoireStatsFillButton
                key={suggestion.field}
                songId={song.id}
                songTitle={song.title}
                field={suggestion.field}
                value={String(shown(suggestion))}
              />
            ))}
          </div>
        )}
      </div>
      <Link
        href={`/dashboard/songs/${song.id}/edit`}
        className="col-start-2 inline-flex min-h-11 items-center gap-1.5 text-[var(--gold-2)] md:col-start-auto md:min-h-0 md:self-start"
      >
        <Pencil aria-hidden className="size-3.5" />
        {t('editSong')}
      </Link>
    </li>
  );
}
