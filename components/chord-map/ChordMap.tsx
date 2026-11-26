'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { ChordShape } from '@/lib/music-theory/chord-shape';
import { buildChordMap, type ChordMapSong } from '@/lib/services/chord-map';

import { ChordMapNext } from './ChordMap.Next';
import { ChordMapSongs } from './ChordMap.Songs';
import { ChordMapSummary } from './ChordMap.Summary';
import { ChordMapTiles } from './ChordMap.Tiles';

type Props = {
  songs: ChordMapSong[];
  /** Shapes from the songs this student has worked on. */
  knownShapes: ChordShape[];
  /** How many of their songs those shapes came from. */
  knownSongCount: number;
  /** Set when a teacher looks at a student's map. */
  studentName?: string | null;
};

/**
 * The chord map (Mapa nauki, view 1): how many catalogue songs the student
 * plays today and which one new shape opens the most. Clicking a tile asks
 * "what if I knew it" — state lives in the page only, nothing is saved.
 */
export function ChordMap({ songs, knownShapes, knownSongCount, studentName }: Props) {
  const t = useTranslations('ChordMap');
  const [known, setKnown] = useState<ReadonlySet<ChordShape>>(() => new Set(knownShapes));
  const [focus, setFocus] = useState<ChordShape | null>(null);
  const map = useMemo(() => buildChordMap(songs, known), [songs, known]);

  const isChanged =
    known.size !== knownShapes.length || knownShapes.some((shape) => !known.has(shape));
  const toggle = (shape: ChordShape) => {
    const next = new Set(known);
    if (next.has(shape)) next.delete(shape);
    else next.add(shape);
    setKnown(next);
    setFocus(null);
  };
  const reset = () => {
    setKnown(new Set(knownShapes));
    setFocus(null);
  };

  const focused = map.next.find((entry) => entry.shape === focus) ?? null;
  const listTitle = focused ? t('songsUnlocked', { shape: focused.shape }) : t('songsPlayable');

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-16 pt-7 text-[var(--ink)] sm:px-8">
      <header className="flex flex-col gap-2">
        <p className="font-[family-name:var(--mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--gold-2)]">
          {t('eyebrow')}
        </p>
        <h1 className="m-0 font-[family-name:var(--serif)] text-3xl font-medium italic tracking-[-0.02em]">
          {studentName ? t('titleStaff', { name: studentName }) : t('title')}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--ink-3)]">
          {knownShapes.length === 0 ? t('leadNoSongs') : t('lead', { songs: knownSongCount })}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <ChordMapSummary
            playable={map.playable.length}
            total={songs.length}
            knownCount={known.size}
            isChanged={isChanged}
            onReset={reset}
          />
          <ChordMapTiles tiles={map.tiles} onToggle={toggle} />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <ChordMapNext next={map.next} focus={focus} onFocus={setFocus} />
          <ChordMapSongs
            key={focus ?? 'playable'}
            title={listTitle}
            songs={focused ? focused.songs : map.playable}
          />
        </div>
      </div>
    </div>
  );
}
