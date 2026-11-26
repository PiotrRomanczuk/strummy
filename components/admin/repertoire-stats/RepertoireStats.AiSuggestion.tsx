'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check, Sparkles, X } from 'lucide-react';

import { decideSuggestion } from '@/app/actions/song-suggestions';
import type { PendingSuggestion } from '@/lib/song-suggestions/fields';

type Props = { suggestion: PendingSuggestion; value: string };
type State = 'open' | 'accepted' | 'rejected' | { error: string };

const BUTTON =
  'inline-flex min-h-9 items-center gap-1 rounded-lg border px-2.5 text-[12.5px] disabled:opacity-60';

/** One AI proposal with its confidence and reason; it is the admin who accepts it into the song, or rejects it. */
export function RepertoireStatsAiSuggestion({ suggestion, value }: Props) {
  const t = useTranslations('RepertoireStats.quality.ai');
  const router = useRouter();
  const [state, setState] = useState<State>('open');
  const [isSaving, startSaving] = useTransition();
  const decide = (accept: boolean) =>
    startSaving(async () => {
      const result = await decideSuggestion({ id: suggestion.id, accept });
      if (!result.ok) return setState({ error: result.error });
      setState(result.decision === 'stale' ? { error: 'stale' } : accept ? 'accepted' : 'rejected');
      router.refresh();
    });
  const field = t(`field.${suggestion.field}`);
  if (state === 'accepted' || state === 'rejected') {
    return <span className="text-[12.5px] text-[var(--ink-3)]">{t(state, { field, value })}</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-[var(--gold)] px-2.5 py-1.5">
      <Sparkles aria-hidden className="size-3.5 text-[var(--gold-2)]" />
      <span className="text-[12.5px]">
        {t('proposal', { field, value })}{' '}
        <span className="font-mono text-[11.5px] text-[var(--ink-3)]">
          {t('confidence', { percent: Math.round(suggestion.confidence * 100) })}
        </span>
      </span>
      {suggestion.reason && (
        <span className="basis-full text-[12px] text-[var(--ink-3)]">{suggestion.reason}</span>
      )}
      <span className="flex gap-2">
        <button
          type="button"
          onClick={() => decide(true)}
          disabled={isSaving}
          className={`${BUTTON} border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]`}
        >
          <Check aria-hidden className="size-3.5" />
          {t('accept')}
        </button>
        <button
          type="button"
          onClick={() => decide(false)}
          disabled={isSaving}
          className={`${BUTTON} border-[var(--rule)] text-[var(--ink-3)]`}
        >
          <X aria-hidden className="size-3.5" />
          {t('reject')}
        </button>
      </span>
      {typeof state === 'object' && (
        <span role="alert" className="basis-full text-[12px] text-[var(--danger)]">
          {t.has(`error.${state.error}`) ? t(`error.${state.error}`) : t('error.save-failed')}
        </span>
      )}
      <span className="basis-full font-mono text-[10.5px] text-[var(--ink-4)]">
        {suggestion.source}
      </span>
    </div>
  );
}
