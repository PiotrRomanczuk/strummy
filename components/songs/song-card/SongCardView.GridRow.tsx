import { coversSlot, type GridCell, type GridTone } from './song-card-grid.helpers';

type Props = {
  label: string;
  cells: GridCell[];
  /** The playing sixteenth, -1 for none. */
  slot: number;
  /** Read-out of the row for screen readers; the cells themselves are hidden from them. */
  description: string;
};

const CENTRED = 'h-8 justify-center';
const TONE: Record<GridTone, string> = {
  count: `${CENTRED} font-mono text-[10.5px] text-[var(--ink-4)]`,
  chord:
    'h-8 justify-start overflow-visible pl-1 font-serif text-base font-semibold text-[var(--ink)]',
  down: `${CENTRED} text-[19px] text-[var(--gold-2)]`,
  up: `${CENTRED} text-[19px] text-[var(--gold-2)]`,
  mute: `${CENTRED} text-[15px] text-[var(--ink-3)]`,
  hit: `${CENTRED} text-xs text-[var(--ink-2)]`,
  ghost: `${CENTRED} text-xs text-[var(--ink-4)]`,
  note: 'mx-px my-1 h-6 justify-start rounded bg-[var(--rule-2)] pl-1.5 font-mono text-[11px] text-[var(--ink-2)]',
  empty: CENTRED,
};

/** One row of the bar's sixteenth grid: a label, then a cell per sixteenth (a bass note may span several). */
export const SongCardGridRow = ({ label, cells, slot, description }: Props) => (
  <div className="grid min-w-[300px] grid-cols-[44px_repeat(16,minmax(16px,1fr))] sm:min-w-[380px] sm:grid-cols-[64px_repeat(16,minmax(19px,1fr))] border-b border-[var(--rule)]">
    <span className="flex h-8 items-center text-xs text-[var(--ink-3)]">
      {label}
      <span className="sr-only">{`: ${description}`}</span>
    </span>
    {cells.map((cell) => (
      <span
        key={cell.slot}
        aria-hidden="true"
        className={`flex min-w-0 items-center whitespace-nowrap ${TONE[cell.tone]} ${
          cell.slot % 4 === 0 ? 'shadow-[inset_1px_0_0_var(--rule)]' : ''
        } ${coversSlot(cell, slot) ? 'bg-[var(--gold-tint)]' : ''} ${cell.isWeak ? 'opacity-50' : ''}`}
        style={cell.span > 1 ? { gridColumn: `span ${cell.span}` } : undefined}
      >
        {cell.text}
      </span>
    ))}
  </div>
);
