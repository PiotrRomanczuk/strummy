'use client';

import { useTranslations } from 'next-intl';

import type { ChordShape } from '@/lib/music-theory/chord-shape';
import type { NextChord } from '@/lib/services/chord-map';

type Props = {
  next: NextChord[];
  focus: ChordShape | null;
  onFocus: (shape: ChordShape | null) => void;
};

/** How many rows of the ranking to show; the tail is rarely worth a shape. */
export const NEXT_ROWS = 6;

/** The ranking: which one new shape opens the most songs. A row shows its songs. */
export function ChordMapNext({ next, focus, onFocus }: Props) {
  const t = useTranslations('ChordMap');
  const rows = next.slice(0, NEXT_ROWS);
  const top = rows[0]?.songs.length ?? 1;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="m-0 font-[family-name:var(--serif)] text-xl font-normal">
          {t('nextTitle')}
        </h2>
        <p className="text-xs text-[var(--ink-4)]">{t('nextHint')}</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm italic text-[var(--ink-4)]">{t('nextEmpty')}</p>
      ) : (
        <ul className="flex flex-col border-t border-[var(--rule)]">
          {rows.map((row) => {
            const isFocused = row.shape === focus;
            return (
              <li key={row.shape}>
                <button
                  type="button"
                  aria-pressed={isFocused}
                  onClick={() => onFocus(isFocused ? null : row.shape)}
                  className={`grid w-full grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--rule)] px-1.5 py-2.5 text-left hover:bg-[var(--rule-2)] focus-visible:outline-2 focus-visible:outline-[var(--gold)] ${isFocused ? 'bg-[var(--gold-tint)] shadow-[inset_2px_0_0_var(--gold)]' : ''}`}
                >
                  <span className="font-[family-name:var(--serif)] text-2xl font-medium leading-none">
                    {row.shape}
                  </span>
                  <span className="relative block h-[3px] bg-[var(--rule)]">
                    <span
                      className="absolute inset-y-0 left-0 bg-[var(--gold)]"
                      style={{ width: `${Math.round((row.songs.length / top) * 100)}%` }}
                    />
                  </span>
                  <span className="text-sm tabular-nums">
                    {t('nextGain', { count: row.songs.length })}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
