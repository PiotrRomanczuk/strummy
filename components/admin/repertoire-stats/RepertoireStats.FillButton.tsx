'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check, PenLine } from 'lucide-react';

import { fillSongFromRecording } from '@/app/actions/song-fill';
import type { FillField } from '@/lib/repertoire-stats/fill';

type Props = { songId: string; songTitle: string; field: FillField; value: string };
type State = 'idle' | 'confirming' | 'saved' | { error: string };

const BUTTON =
  'inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] disabled:opacity-60';

/** Proposes one value from the recording; nothing is written until the admin confirms. */
export function RepertoireStatsFillButton({ songId, songTitle, field, value }: Props) {
  const t = useTranslations('RepertoireStats.quality.fill');
  const router = useRouter();
  const [state, setState] = useState<State>('idle');
  const [isSaving, startSaving] = useTransition();
  const save = () =>
    startSaving(async () => {
      const result = await fillSongFromRecording({ songId, field });
      if (!result.ok) {
        setState({ error: result.error });
        return;
      }
      setState('saved');
      router.refresh();
    });

  if (state === 'saved') {
    return (
      <span className="inline-flex items-center gap-1 text-[12.5px] text-[var(--success)]">
        <Check aria-hidden className="size-3.5" />
        {t('saved', { field: t(`field.${field}`), value })}
      </span>
    );
  }
  if (state === 'confirming') {
    return (
      <span
        role="group"
        aria-label={t('confirmLabel')}
        className="inline-flex flex-wrap items-center gap-2"
      >
        <span className="text-[12.5px]">
          {t('confirm', { field: t(`field.${field}`), value, title: songTitle })}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={isSaving}
          className={`${BUTTON} border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]`}
        >
          {t('save')}
        </button>
        <button
          type="button"
          onClick={() => setState('idle')}
          disabled={isSaving}
          className={`${BUTTON} border-[var(--rule)] text-[var(--ink-3)]`}
        >
          {t('cancel')}
        </button>
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setState('confirming')}
        className={`${BUTTON} border-[var(--gold)] text-[var(--gold-2)] hover:bg-[var(--gold-tint)]`}
      >
        <PenLine aria-hidden className="size-3.5" />
        {t('button', { field: t(`field.${field}`), value })}
      </button>
      {typeof state === 'object' && (
        <span role="alert" className="text-[12px] text-[var(--danger)]">
          {t.has(`error.${state.error}`) ? t(`error.${state.error}`) : t('error.save-failed')}
        </span>
      )}
    </span>
  );
}
