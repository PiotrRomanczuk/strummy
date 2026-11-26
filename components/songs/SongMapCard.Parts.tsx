'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { partColours, partKind, type PartKind } from '@/lib/music-theory/song-map';
import type { SongPart } from '@/schemas/SongSegmentsSchema';

import { SongMapPartDetail } from './SongMapCard.Detail';

type Props = { parts: SongPart[]; beatsPerBar: number };

export const KIND_LABEL = {
  intro: 'mapNameIntro',
  verse: 'mapNameVerse',
  chorus: 'mapNameChorus',
  bridge: 'mapNameBridge',
  solo: 'mapNameSolo',
  inst: 'mapNameInst',
  break: 'mapNameBreak',
  outro: 'mapNameOutro',
} as const satisfies Record<PartKind, string>;

// One stripe colour per kind of part (or per letter when the parts have no names), in a fixed order.
const STRIPE = [
  'border-t-[var(--chart-1)]',
  'border-t-[var(--chart-2)]',
  'border-t-[var(--chart-3)]',
  'border-t-[var(--chart-4)]',
  'border-t-[var(--chart-5)]',
];

const partClass = (isActive: boolean, stripe: string) =>
  `min-w-0 basis-0 overflow-hidden rounded-sm border border-t-4 px-1 py-1 text-left font-mono text-[10px] leading-tight transition-colors ${stripe} ${
    isActive
      ? 'border-x-[var(--ink)] border-b-[var(--ink)] bg-[var(--rule)] text-[var(--ink)]'
      : 'border-x-[var(--rule)] border-b-[var(--rule)] text-[var(--ink-3)] hover:text-[var(--ink)]'
  }`;

/** The form as a strip (a part's width is its number of bars) and the details of the picked part. */
export const SongMapParts = ({ parts, beatsPerBar }: Props) => {
  const t = useTranslations('Songs');
  const [picked, setPicked] = useState(0);
  const colours = partColours(parts, STRIPE.length);
  const nameOf = (part: SongPart) => {
    const kind = partKind(part.name);
    return kind ? t(KIND_LABEL[kind]) : (part.name ?? part.label);
  };
  const part = parts[picked] ?? parts[0];

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label={t('mapParts')} className="flex gap-0.5">
        {parts.map((item, i) => (
          <button
            key={item.n}
            type="button"
            aria-pressed={i === picked}
            aria-label={t('mapPartLabel', { n: item.n, name: nameOf(item), bars: item.bars })}
            title={t('mapPartLabel', { n: item.n, name: nameOf(item), bars: item.bars })}
            onClick={() => setPicked(i)}
            className={partClass(i === picked, STRIPE[colours[i]])}
            style={{ flexGrow: Math.max(item.bars, 1) }}
          >
            <span className="block truncate">{nameOf(item)}</span>
          </button>
        ))}
      </div>
      <SongMapPartDetail part={part} name={nameOf(part)} slots={beatsPerBar * 4} />
    </div>
  );
};
