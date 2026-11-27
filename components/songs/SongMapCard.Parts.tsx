'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { partColours, partKind, partRuns, type PartKind } from '@/lib/music-theory/song-map';
import type { SongPart } from '@/schemas/SongSegmentsSchema';

import { SongMapPartDetail } from './SongMapCard.Detail';
import { SongMapRepeats } from './SongMapCard.Repeats';

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

const runClass = (isActive: boolean, stripe: string) =>
  `flex min-w-fit basis-0 items-baseline gap-1 rounded-sm border border-t-4 px-2 py-1.5 text-left font-mono text-xs leading-tight transition-colors ${stripe} ${
    isActive
      ? 'border-x-[var(--ink)] border-b-[var(--ink)] bg-[var(--rule)] text-[var(--ink)]'
      : 'border-x-[var(--rule)] border-b-[var(--rule)] text-[var(--ink-3)] hover:text-[var(--ink)]'
  }`;

/**
 * The form as a strip and the details of the picked part. Parts repeated back to back share one chip ("Intro ×4",
 * its width the run's bars); a row of numbers under the strip steps through the repeats of the picked run.
 */
export const SongMapParts = ({ parts, beatsPerBar }: Props) => {
  const t = useTranslations('Songs');
  const [picked, setPicked] = useState(0);
  const colours = partColours(parts, STRIPE.length);
  const runs = partRuns(parts);
  const nameOf = (part: SongPart) => {
    const kind = partKind(part.name);
    return kind ? t(KIND_LABEL[kind]) : (part.name ?? part.label);
  };
  const part = parts[picked] ?? parts[0];
  const run = runs.find((r) => picked >= r.start && picked < r.start + r.count) ?? runs[0];
  const runLabel = (r: (typeof runs)[number]) => {
    const first = parts[r.start];
    const name = nameOf(first);
    if (r.count === 1) return t('mapPartLabel', { n: first.n, name, bars: first.bars });
    const last = parts[r.start + r.count - 1];
    return t('mapRunLabel', { name, count: r.count, from: first.n, to: last.n, bars: r.bars });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div role="group" aria-label={t('mapParts')} className="flex flex-wrap gap-1">
          {runs.map((item) => (
            <button
              key={parts[item.start].n}
              type="button"
              aria-pressed={item === run}
              aria-label={runLabel(item)}
              title={runLabel(item)}
              onClick={() => setPicked(item.start)}
              className={runClass(item === run, STRIPE[colours[item.start]])}
              style={{ flexGrow: Math.max(item.bars, 1) }}
            >
              <span className="whitespace-nowrap">{nameOf(parts[item.start])}</span>
              {item.count > 1 && (
                <span className="shrink-0 text-[10px] text-[var(--ink-3)]">×{item.count}</span>
              )}
            </button>
          ))}
        </div>
        {run && run.count > 1 && (
          <SongMapRepeats
            parts={parts.slice(run.start, run.start + run.count)}
            name={nameOf(parts[run.start])}
            picked={picked - run.start}
            onPick={(i) => setPicked(run.start + i)}
          />
        )}
      </div>
      <SongMapPartDetail part={part} name={nameOf(part)} slots={beatsPerBar * 4} />
    </div>
  );
};
