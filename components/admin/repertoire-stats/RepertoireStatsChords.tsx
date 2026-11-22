import { nameNotes, type NoteNaming } from '@/lib/music-theory/note-naming';

export function ChordChip({
  name,
  names,
  isAccent,
}: {
  name: string;
  names: NoteNaming;
  isAccent?: boolean;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-[5px] border bg-[var(--paper)] px-1.5 py-px font-mono text-[12px] ${isAccent ? 'border-[var(--gold)] text-[var(--gold-2)]' : 'border-[var(--rule)] text-[var(--ink-2)]'}`}
    >
      {nameNotes(name, names)}
    </span>
  );
}

/** Chords in a row, each with its scale degree underneath when given. */
export function ChordList({
  chords,
  degrees,
  names,
}: {
  chords: string[];
  degrees?: string[];
  names: NoteNaming;
}) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {chords.map((chord, i) => (
        <span key={`${chord}-${i}`} className="inline-flex flex-col gap-0.5">
          <ChordChip name={chord} names={names} />
          {degrees && (
            <span className="text-center font-mono text-[10.5px] text-[var(--ink-4)]">
              {degrees[i]}
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

export function Degrees({ roman }: { roman: string[] }) {
  return <span className="font-mono text-[12.5px] tracking-[0.02em]">{roman.join(' – ')}</span>;
}
