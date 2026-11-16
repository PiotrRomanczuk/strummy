import { nameNotes, type NoteNaming } from '@/lib/music-theory/note-naming';
import { midiName } from '@/lib/music-theory/transcription-roll';
import { chordNames } from '@/lib/repertoire-stats/chord-agreement';
import { formatDuration } from '@/lib/repertoire-stats/mismatches';
import type { RepertoireSong, TrackSummary } from '@/lib/repertoire-stats/repertoire-song';

import { ChordList, Degrees, MeterBar } from './RepertoireStatsPrimitives';
import { decimal, keyLabel, type Translate } from './repertoire-stats.i18n';

export const COMPARE_ROWS = [
  'tempo',
  'key',
  'capo',
  'metre',
  'duration',
  'vocalRange',
  'bassRange',
  'bassDensity',
  'chords',
  'progressions',
] as const;
export type CompareRow = (typeof COMPARE_ROWS)[number];

type Context = { names: NoteNaming; locale: string; t: Translate; densestBass: number };
type Props = { row: CompareRow; song: RepertoireSong; context: Context };

/** The shared pitch axis of the ranges, C1–C6 in MIDI. */
const AXIS = [24, 84];
const PROGRESSIONS_SHOWN = 3;

function Missing({ t }: { t: Translate }) {
  return <span className="text-[var(--ink-4)]">{t('compare.noTranscription')}</span>;
}

function Range({ track, context }: { track: TrackSummary | undefined; context: Context }) {
  if (!track || track.low === null || track.high === null) return <Missing t={context.t} />;
  const span = AXIS[1] - AXIS[0];
  const note = (pitch: number) => nameNotes(midiName(pitch), context.names);
  return (
    <div>
      <div className="relative h-1.5 rounded-full bg-[var(--rule-2)]">
        <div
          className="absolute inset-y-0 rounded-full bg-[var(--ink)]"
          style={{
            left: `${((track.low - AXIS[0]) / span) * 100}%`,
            width: `${((track.high - track.low) / span) * 100}%`,
          }}
        />
      </div>
      <div className="mt-1 font-mono text-[12px]">
        {note(track.low)} – {note(track.high)}
      </div>
    </div>
  );
}

function BassDensity({ song, context }: { song: RepertoireSong; context: Context }) {
  const perBar = song.transcription?.tracks.Bas?.perBar;
  if (perBar === undefined) return <Missing t={context.t} />;
  return (
    <div className="grid grid-cols-[1fr_34px] items-center gap-2.5">
      <MeterBar value={perBar} max={context.densestBass} tone="bg-[var(--ink)]" />
      <span className="font-mono">{decimal(perBar, context.locale)}</span>
    </div>
  );
}

/** One field of one song in the comparison; measured values win over entered ones. */
export function RepertoireStatsCompareCell({ row, song, context }: Props) {
  const { t, names } = context;
  const { entered, measured, transcription } = song;
  const mono = (text: string) => <span className="font-mono">{text}</span>;
  switch (row) {
    case 'tempo':
      return mono(t('bpm', { value: Math.round(measured?.bpm ?? entered.tempo ?? 0) }));
    case 'key':
      return mono(keyLabel(measured?.key ?? entered.key, names, t));
    case 'capo':
      return t('compare.capo', {
        entered: entered.capo,
        suggested: measured?.suggestedCapo ?? '–',
      });
    case 'metre':
      return mono(
        measured?.beatsPerBar ? t('overview.beats', { beats: measured.beatsPerBar }) : '–'
      );
    case 'duration':
      return mono(formatDuration(measured?.durationMs ?? entered.durationMs));
    case 'vocalRange':
      return <Range track={transcription?.tracks.Wokal} context={context} />;
    case 'bassRange':
      return <Range track={transcription?.tracks.Bas} context={context} />;
    case 'bassDensity':
      return <BassDensity song={song} context={context} />;
    case 'chords':
      return <ChordList chords={chordNames(entered.chords)} names={names} />;
    case 'progressions':
      return (
        <div className="flex flex-col gap-1">
          {(measured?.progressions ?? []).slice(0, PROGRESSIONS_SHOWN).map((progression, i) => (
            <Degrees key={i} roman={progression.roman} />
          ))}
        </div>
      );
  }
}
