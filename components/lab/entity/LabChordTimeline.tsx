import { chordEvents, formatSeconds } from './lab-entity.helpers';

type Props = { chords: unknown; label: string };

/** Chord ID's chords in time, collapsed so a held chord shows once. */
export function LabChordTimeline({ chords, label }: Props) {
  const events = chordEvents(chords).filter((event, i, all) => i === 0 || all[i - 1].chord !== event.chord);
  return (
    <ol className="flex flex-wrap gap-1.5" aria-label={label}>
      {events.map((event) => (
        <li
          key={`${event.at}-${event.chord}`}
          className="rounded border px-1.5 py-0.5 text-xs dark:border-input"
        >
          <span className="mr-1 font-mono text-[10px] text-muted-foreground">{formatSeconds(event.at)}</span>
          <span className="font-semibold">{event.chord}</span>
        </li>
      ))}
    </ol>
  );
}
