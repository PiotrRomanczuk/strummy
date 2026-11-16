'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PenLine, Sparkles } from 'lucide-react';

import { fillAllFromRecording } from '@/app/actions/song-fill';
import { acceptConfidentSuggestions } from '@/app/actions/song-suggestions';
import { CONFIDENT } from '@/lib/song-suggestions/fields';

type Props = { fillValues: number; confidentAi: number };
type Kind = 'fill' | 'ai';

const BUTTON =
  'inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] disabled:opacity-60';

/** One click for many proposals — still confirmed first, still only into empty fields. */
export function RepertoireStatsBulkActions({ fillValues, confidentAi }: Props) {
  const t = useTranslations('RepertoireStats.quality.bulk');
  const router = useRouter();
  const [confirming, setConfirming] = useState<Kind | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const run = (kind: Kind) =>
    startSaving(async () => {
      const result =
        kind === 'fill'
          ? await fillAllFromRecording()
          : await acceptConfidentSuggestions({ minConfidence: CONFIDENT });
      setConfirming(null);
      if (!result.ok) return setMessage(t('error'));
      setMessage(
        'filled' in result
          ? t('filled', { count: result.filled })
          : t('accepted', { count: result.accepted, stale: result.stale })
      );
      router.refresh();
    });
  if (fillValues === 0 && confidentAi === 0 && !message) return null;
  const actions: { kind: Kind; count: number; icon: typeof PenLine }[] = [
    { kind: 'fill', count: fillValues, icon: PenLine },
    { kind: 'ai', count: confidentAi, icon: Sparkles },
  ];
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2.5 rounded-[10px] border border-[var(--rule)] bg-[var(--paper)] px-4 py-3">
      {actions
        .filter((action) => action.count > 0)
        .map(({ kind, count, icon: Icon }) =>
          confirming === kind ? (
            <span
              key={kind}
              role="group"
              aria-label={t('confirmLabel')}
              className="inline-flex flex-wrap items-center gap-2"
            >
              <span className="text-[13px]">
                {t(`${kind}Confirm`, { count, percent: CONFIDENT * 100 })}
              </span>
              <button
                type="button"
                onClick={() => run(kind)}
                disabled={isSaving}
                className={`${BUTTON} border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]`}
              >
                {t('save')}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                disabled={isSaving}
                className={`${BUTTON} border-[var(--rule)] text-[var(--ink-3)]`}
              >
                {t('cancel')}
              </button>
            </span>
          ) : (
            <button
              key={kind}
              type="button"
              onClick={() => setConfirming(kind)}
              className={`${BUTTON} border-[var(--gold)] text-[var(--gold-2)] hover:bg-[var(--gold-tint)]`}
            >
              <Icon aria-hidden className="size-3.5" />
              {t(kind, { count, percent: CONFIDENT * 100 })}
            </button>
          )
        )}
      {message && (
        <span role="status" className="text-[13px] text-[var(--ink-3)]">
          {message}
        </span>
      )}
    </div>
  );
}
