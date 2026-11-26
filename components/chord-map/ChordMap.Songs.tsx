'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { ChordMapSong } from '@/lib/services/chord-map';

type Props = { title: string; songs: ChordMapSong[] };

/** Songs shown before "show all"; a long list buries the ranking beside it. */
export const SONGS_SHOWN = 8;

/** The songs behind the current answer: playable today, or opened by one shape. */
export function ChordMapSongs({ title, songs }: Props) {
  const t = useTranslations('ChordMap');
  const [isExpanded, setIsExpanded] = useState(false);
  const shown = isExpanded ? songs : songs.slice(0, SONGS_SHOWN);

  return (
    <section className="flex flex-col gap-2">
      <h3 className="m-0 font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--ink-4)]">
        {title}
      </h3>
      {songs.length === 0 ? (
        <p className="text-sm italic text-[var(--ink-4)]">{t('songsEmpty')}</p>
      ) : (
        <ul className="flex flex-col">
          {shown.map((song) => (
            <li key={song.id} className="border-b border-[var(--rule)]">
              <Link
                href={`/dashboard/songs/${song.id}`}
                className="flex items-baseline justify-between gap-3 py-2 hover:bg-[var(--rule-2)] focus-visible:outline-2 focus-visible:outline-[var(--gold)]"
              >
                <span className="min-w-0">
                  <span className="block truncate font-[family-name:var(--serif)] text-base font-medium">
                    {song.title}
                  </span>
                  {song.author && (
                    <span className="block truncate text-xs text-[var(--ink-4)]">
                      {song.author}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-[var(--ink-3)]">
                  {song.shapes.join('  ')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {songs.length > SONGS_SHOWN && !isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="self-start rounded-md px-1 py-1 text-xs font-medium text-[var(--gold-2)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--gold)]"
        >
          {t('showAll', { count: songs.length })}
        </button>
      )}
    </section>
  );
}
