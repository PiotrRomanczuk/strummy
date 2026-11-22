import { nameNotes, type NoteNaming } from '@/lib/music-theory/note-naming';
import type { SongSection } from '@/lib/repertoire-stats/song-progressions';

type Props = { sections: SongSection[]; names: NoteNaming; barsLabel: (count: number) => string };

/** Up to this many sections the chords sit under each segment; past it the bar is letters and a legend. */
const ROOMY = 6;
/** A segment narrower than this share of the song has no room for its chords. */
const NARROW = 0.12;
const TONES = [
  'bg-[var(--rule-2)] text-[var(--ink)]',
  'bg-[var(--ink-5)] text-[var(--ink)]',
  'bg-[var(--ink)] text-[var(--paper)]',
  'bg-[var(--gold-tint)] text-[var(--ink)]',
  'bg-[var(--ink-4)] text-[var(--paper)]',
];

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/** The song's sections as one bar, each segment as wide as its bars, with the chords it plays. */
export function RepertoireStatsSectionBar({ sections, names, barsLabel }: Props) {
  const labels = [...new Set(sections.map((section) => section.label))];
  const tone = (label: string) => TONES[labels.indexOf(label) % TONES.length];
  const total = sections.reduce((sum, section) => sum + section.bars, 0);
  const isCompact =
    sections.length > ROOMY || sections.some((section) => section.bars / total < NARROW);
  const legend = labels.map(
    (label) => sections.find((section) => section.label === label) as SongSection
  );
  return (
    <div>
      <div className="flex gap-0.5">
        {sections.map((section, i) => (
          <div
            key={`${section.label}-${i}`}
            title={`${section.label}: ${barsLabel(section.bars)}, ${clock(section.startS)}`}
            className="min-w-0 basis-0"
            style={{ flexGrow: section.bars }}
          >
            <div
              className={`flex h-[34px] items-center justify-between px-2 ${tone(section.label)} ${i === 0 ? 'rounded-l-[5px]' : ''} ${i === sections.length - 1 ? 'rounded-r-[5px]' : ''}`}
            >
              <span className="font-serif text-[15px] font-medium">{section.label}</span>
              {!isCompact && (
                <span className="hidden font-mono text-[11px] md:inline">{section.bars}</span>
              )}
            </div>
            <div className="mb-1.5 mt-1 truncate font-mono text-[10.5px] text-[var(--ink-4)]">
              {clock(section.startS)}
            </div>
            {!isCompact && (
              <div className="hidden border-l border-[var(--rule)] pl-2 md:block">
                <div className="truncate font-mono text-[12px]">{section.roman.join(' – ')}</div>
                <div className="truncate font-mono text-[11px] text-[var(--ink-4)]">
                  {nameNotes(section.chords.join(' '), names)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className={`mt-1.5 flex-col gap-1 ${isCompact ? 'flex' : 'flex md:hidden'}`}>
        {legend.map((section) => (
          <div key={section.label} className="flex items-baseline gap-2.5">
            <span className="w-4 font-serif text-[14px] font-medium">{section.label}</span>
            <span className="font-mono text-[12px]">{section.roman.join(' – ')}</span>
            <span className="truncate font-mono text-[11px] text-[var(--ink-4)]">
              {nameNotes(section.chords.join(' '), names)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
