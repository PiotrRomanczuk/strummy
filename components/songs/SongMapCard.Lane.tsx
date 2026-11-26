import type { LaneCell } from '@/lib/music-theory/song-map';

type Props = { label: string; cells: LaneCell[]; slots: number };

const LEVEL = {
  on: 'bg-[var(--ink)] text-[var(--card)]',
  half: 'bg-[var(--ink-4)]',
  off: 'bg-[var(--rule)]',
} as const;

/** One row of a sixteenth grid, like a drum machine's: filled where the part plays, a gap before every beat. */
export const SongMapLane = ({ label, cells, slots }: Props) => (
  <div className="flex items-center gap-2">
    <span className="w-14 shrink-0 font-mono text-[10px] text-[var(--ink-3)]">{label}</span>
    <div
      role="img"
      aria-label={`${label}: ${cells.map((cell) => (cell.level === 'off' ? '.' : cell.text || 'x')).join(' ')}`}
      className="grid flex-1 gap-px"
      style={{ gridTemplateColumns: `repeat(${slots}, minmax(0, 1fr))` }}
    >
      {cells.map((cell, i) => (
        <span
          key={i}
          data-level={cell.level}
          className={`flex h-5 items-center overflow-hidden rounded-[2px] px-0.5 font-mono text-[9px] ${LEVEL[cell.level]} ${
            cell.isBeat && i > 0 ? 'ml-0.5' : ''
          }`}
          style={{ gridColumn: `span ${cell.span}` }}
        >
          {cell.text}
        </span>
      ))}
    </div>
  </div>
);
