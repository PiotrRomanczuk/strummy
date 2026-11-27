import { useTranslations } from 'next-intl';

import { RIFF_SHARE_TO_NAME, partLoop, patternCells, riffCells } from '@/lib/music-theory/song-map';
import type { SongPart } from '@/schemas/SongSegmentsSchema';

import { SongMapLane } from './SongMapCard.Lane';

type Props = { part: SongPart; name: string; slots: number; tempoScale?: number };

// song2logic names the drum tracks in Polish; the card shows them in the reader's language, in kit order.
export const DRUM_LABEL = {
  Stopa: 'mapDrumKick',
  Werbel: 'mapDrumSnare',
  'Hi-hat': 'mapDrumHiHat',
  Ride: 'mapDrumRide',
  Tomy: 'mapDrumToms',
  Crash: 'mapDrumCrash',
} as const;
const DRUMS = Object.keys(DRUM_LABEL) as (keyof typeof DRUM_LABEL)[];

export const GROOVE_LABEL = {
  four_on_the_floor: 'mapKickFour',
  one_and_three: 'mapKickOneThree',
  syncopated: 'mapKickSyncopated',
  backbeat: 'mapSnareBackbeat',
  backbeat_syncopated: 'mapSnareBackbeatBusy',
  half_time: 'mapSnareHalfTime',
  four_beats: 'mapSnareFour',
  other: 'mapSnareOther',
} as const;

export const SUBDIVISION = {
  quarters: 'mapCymbalQuarters',
  eighths: 'mapCymbalEighths',
  sixteenths: 'mapCymbalSixteenths',
} as const;

const heading = 'font-mono text-[10px] uppercase tracking-[.14em] text-[var(--ink-4)]';
export const lookup = <T extends Record<string, string>>(
  map: T,
  key?: string | null
): T[keyof T] | null => (key != null && key in map ? map[key as keyof T] : null);

/** The picked part: its chords bar by bar (or its loop), the drums as a sixteenth grid and the bass riff. */
export const SongMapPartDetail = ({ part, name, slots, tempoScale = 1 }: Props) => {
  const t = useTranslations('Songs');
  const loop = partLoop(part);
  const bars = loop ?? { chords: part.chords, roman: part.roman };
  const facts = [
    t('mapPartBars', { bars: part.bars }),
    `${Math.round(part.bpm * tempoScale)} BPM`,
    ...(loop ? [t('mapPartLoop', { bars: loop.roman.length, times: loop.times })] : []),
    ...(part.vocals === null ? [] : [t(part.vocals ? 'mapPartSung' : 'mapPartInstrumental')]),
    ...(part.repeat_of === null ? [] : [t('mapPartRepeat', { n: part.repeat_of })]),
  ];
  const drums = DRUMS.filter((drum) => part.drums?.patterns[drum]);
  const [cymbalDrum, cymbalStep] = part.drums?.cymbal?.split(' ') ?? [];
  const kick = lookup(GROOVE_LABEL, part.drums?.kick);
  const snare = lookup(GROOVE_LABEL, part.drums?.snare);
  const cymbal = lookup(DRUM_LABEL, cymbalDrum);
  const step = lookup(SUBDIVISION, cymbalStep);
  const groove = [
    kick && t(kick),
    snare && t(snare),
    cymbal && step && t(step, { drum: t(cymbal) }),
  ].filter(Boolean);
  const riff = part.bass?.riff ?? [];
  const isNamed = (part.bass?.riff_share ?? 0) >= RIFF_SHARE_TO_NAME;
  const percent = Math.round((part.bass?.riff_share ?? 0) * 100);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-serif text-base text-[var(--ink)]">{`${part.n}. ${name}`}</span>
        <span className="font-mono text-xs text-[var(--ink-3)]">{facts.join(' · ')}</span>
      </div>
      <section aria-label={t('mapChords')} className="flex flex-col gap-1.5">
        <h4 className={heading}>{t('mapChords')}</h4>
        <ol className="grid grid-cols-4 gap-1">
          {bars.chords.map((chord, i) => (
            <li key={i} className="rounded border border-[var(--rule)] px-2 py-1">
              <span className="block truncate font-medium text-[var(--ink)]">{chord}</span>
              <span className="block truncate font-mono text-[10px] text-[var(--ink-3)]">
                {bars.roman[i]}
              </span>
            </li>
          ))}
        </ol>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <section aria-label={t('mapDrums')} className="flex flex-col gap-1.5">
          <h4 className={heading}>{t('mapDrums')}</h4>
          {drums.length === 0 && <p className="text-xs text-[var(--ink-3)]">{t('mapNoDrums')}</p>}
          {drums.map((drum) => (
            <SongMapLane
              key={drum}
              label={t(DRUM_LABEL[drum])}
              cells={patternCells(part.drums?.patterns[drum] ?? '')}
              slots={slots}
            />
          ))}
          {groove.length > 0 && <p className="text-xs text-[var(--ink-3)]">{groove.join(' · ')}</p>}
        </section>
        <section aria-label={t('mapBass')} className="flex flex-col gap-1.5">
          <h4 className={heading}>{t('mapBass')}</h4>
          {riff.length === 0 ? (
            <p className="text-xs text-[var(--ink-3)]">{t('mapNoBass')}</p>
          ) : (
            <>
              <SongMapLane
                label={t('mapBassLane')}
                cells={riffCells(riff, slots, isNamed)}
                slots={slots}
              />
              <p className="text-xs text-[var(--ink-3)]">
                {t(isNamed ? 'mapBassShare' : 'mapBassRhythmOnly', { percent })}
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
};
