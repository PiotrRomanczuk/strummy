import { chordSheetParts } from './lab-entity.helpers';

type Props = { text: unknown };

/** A Chordonomicon / UG chord sheet, one line per part (intro, verse, chorus…). */
export function LabChordSheet({ text }: Props) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
      {chordSheetParts(text).map((part, index) => (
        <div key={`${part.part}-${index}`} className="contents">
          <dt className="text-xs text-muted-foreground">{part.part}</dt>
          <dd className="font-mono text-xs">{part.chords.join('  ')}</dd>
        </div>
      ))}
    </dl>
  );
}
