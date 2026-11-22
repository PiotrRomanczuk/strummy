import { Fragment } from 'react';

import { nameNotes, type NoteNaming } from '@/lib/music-theory/note-naming';
import { midiName } from '@/lib/music-theory/transcription-roll';
import type { TrackProfile } from '@/lib/repertoire-stats/arrangement';

import { MeterBar, StatsLabel } from './RepertoireStatsPrimitives';

export type ArrangementSong = { letter: string; title: string; bar: string };
type Labels = { plays: string; perBar: string; range: string; silent: string; repertoire: string };
type Props = {
  profile: TrackProfile;
  songs: ArrangementSong[];
  names: NoteNaming;
  labels: Labels;
  format: (value: number) => string;
};

/** The pitch axis of every range, C1–E6. */
const AXIS: [number, number] = [24, 88];
/** Position on the axis in %, clamped: a piano reaches below C1 and above E6. */
const at = (pitch: number) =>
  Math.min(100, Math.max(0, ((pitch - AXIS[0]) / (AXIS[1] - AXIS[0])) * 100));
const note = (pitch: number, names: NoteNaming) => nameNotes(midiName(pitch), names);

/** One track: per song whether it plays, its notes per bar and its range against the repertoire's. */
export function RepertoireStatsTrackTile({ profile, songs, names, labels, format }: Props) {
  const range = profile.repertoireRange;
  return (
    <section className="min-w-0 rounded-[10px] border border-[var(--rule)] bg-[var(--card)] px-4 pb-3 pt-4">
      <h3 className="mb-2 font-serif text-[17px] font-medium">{profile.track}</h3>
      <div
        className={`grid items-center gap-x-2.5 gap-y-1.5 ${range ? 'grid-cols-[14px_48px_minmax(0,1fr)_minmax(0,1.2fr)]' : 'grid-cols-[14px_48px_minmax(0,1fr)]'}`}
      >
        <span />
        <StatsLabel className="text-[9.5px]">{labels.plays}</StatsLabel>
        <StatsLabel className="text-[9.5px]">{labels.perBar}</StatsLabel>
        {range && <StatsLabel className="text-[9.5px]">{labels.range}</StatsLabel>}
        {songs.map((song, i) => {
          const track = profile.songs[i];
          if (!track) {
            return (
              <Fragment key={song.letter}>
                <span title={song.title} className="font-mono text-[11px] font-medium">
                  {song.letter}
                </span>
                <span className="col-span-3 text-[12px] text-[var(--ink-4)]">{labels.silent}</span>
              </Fragment>
            );
          }
          return (
            <Fragment key={song.letter}>
              <span title={song.title} className="font-mono text-[11px] font-medium">
                {song.letter}
              </span>
              <span className="font-mono text-[12px]">{Math.round(track.activeShare * 100)}%</span>
              <div className="grid grid-cols-[1fr_30px] items-center gap-1.5">
                <MeterBar value={track.perBar} max={profile.maxPerBar} tone={song.bar} />
                <span className="text-right font-mono text-[11.5px]">{format(track.perBar)}</span>
              </div>
              {range && (
                <div
                  title={
                    track.low !== null && track.high !== null
                      ? `${song.title}: ${note(track.low, names)}–${note(track.high, names)}`
                      : song.title
                  }
                  className="relative h-[5px] rounded-full bg-[var(--rule-2)]"
                >
                  <div
                    className="absolute -inset-y-[3px] rounded border border-dashed border-[var(--ink-5)]"
                    style={{ left: `${at(range[0])}%`, right: `${100 - at(range[1])}%` }}
                  />
                  {track.low !== null && track.high !== null && (
                    <div
                      className={`absolute inset-y-0 rounded-full ${song.bar}`}
                      style={{ left: `${at(track.low)}%`, right: `${100 - at(track.high)}%` }}
                    />
                  )}
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
      {range && (
        <div className="mt-2 flex justify-end font-mono text-[10px] text-[var(--ink-4)]">
          {labels.repertoire}: {note(range[0], names)}–{note(range[1], names)}
        </div>
      )}
    </section>
  );
}
