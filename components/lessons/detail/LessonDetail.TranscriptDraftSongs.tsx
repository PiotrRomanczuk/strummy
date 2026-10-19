'use client';

import { useTranslations } from 'next-intl';

import { Checkbox } from '@/components/ui/checkbox';
import { LESSON_SONG_STATUSES } from '@/lib/ai/schemas/lesson-transcript-draft';

import { DRAFT_FIELD, DRAFT_ROW, DRAFT_SECTION_LABEL, DRAFT_TAG } from './transcript-draft.styles';
import type { SongRow } from './useTranscriptDraftSelection';

type Props = {
  rows: SongRow[];
  onChange: (key: string, patch: Partial<SongRow>) => void;
};

/** One row per song the model heard: tick to write it, adjust status and notes. */
export function TranscriptDraftSongs({ rows, onChange }: Props) {
  const t = useTranslations('Lessons');
  if (!rows.length) return null;

  return (
    <section className="mb-5">
      <h4 className={DRAFT_SECTION_LABEL}>{t('draftSongs')}</h4>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map((row) => (
          <li key={row.key} data-testid="draft-song" className={`${DRAFT_ROW} ${row.include ? '' : 'opacity-60'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <Checkbox
                id={row.key}
                checked={row.include}
                onCheckedChange={(checked) => onChange(row.key, { include: checked === true })}
              />
              <label htmlFor={row.key} className="min-w-0 flex-1 text-[14px] text-[var(--ink)]">
                {row.value.newSong?.title ?? row.heard}
                {row.value.newSong?.author && (
                  <span className="text-[var(--ink-3)]"> · {row.value.newSong.author}</span>
                )}
              </label>
              <span className={DRAFT_TAG}>{row.isNew ? t('draftSongNew') : t('draftSongCatalog')}</span>
              <select
                aria-label={t('draftSongs')}
                value={row.value.status}
                onChange={(e) =>
                  onChange(row.key, { value: { ...row.value, status: e.target.value as SongRow['value']['status'] } })
                }
                className="rounded-md border border-[var(--rule)] bg-[var(--card)] px-2 py-1 text-[12px] text-[var(--ink-2)]"
              >
                {LESSON_SONG_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(`draftStatus.${status}`)}
                  </option>
                ))}
              </select>
            </div>
            {row.include && (
              <textarea
                aria-label={t('draftSongNotes')}
                placeholder={t('draftSongNotes')}
                value={row.value.notes}
                onChange={(e) => onChange(row.key, { value: { ...row.value, notes: e.target.value } })}
                rows={Math.min(4, Math.max(1, row.value.notes.split('\n').length))}
                className={`${DRAFT_FIELD} mt-2 resize-y`}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
