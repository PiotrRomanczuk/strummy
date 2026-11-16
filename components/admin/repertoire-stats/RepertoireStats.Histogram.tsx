import type { Bin } from '@/lib/repertoire-stats/distributions';

type Props = { bins: Bin[]; label: string; thisSong: string };

const WIDTH = 480;
const HEIGHT = 176;
const PAD_LEFT = 26;
const PAD_TOP = 26; // room above the tallest bar for the "this song" marker
const PAD_BOTTOM = 26;
const GAP = 2;
const RADIUS = 4;
const MAX_X_LABELS = 8;
const CHAR_WIDTH = 6; // a 10px monospace character, to keep labels inside the frame

/** A bar with rounded corners at its data end and square at the baseline. */
function barPath(x: number, y: number, width: number, height: number): string {
  const r = Math.min(RADIUS, width / 2, height);
  const bottom = y + height;
  return `M${x},${bottom}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${bottom}Z`;
}

/** Where a centred label of `text` fits: centred, or pinned to the edge it would cross. */
function fit(center: number, text: string) {
  const half = (text.length * CHAR_WIDTH) / 2;
  if (center + half > WIDTH) return { x: WIDTH, anchor: 'end' as const };
  if (center - half < 0) return { x: 0, anchor: 'start' as const };
  return { x: center, anchor: 'middle' as const };
}

function AxisLabel({ center, text }: { center: number; text: string }) {
  const { x, anchor } = fit(center, text);
  return (
    <text
      x={x}
      y={HEIGHT - 8}
      textAnchor={anchor}
      className="fill-[var(--ink-3)] font-mono text-[10px]"
    >
      {text}
    </text>
  );
}

/** The selected bin's marker, drawn last so no bar covers it: a label on top and a rule down to its bar. */
function SelectedMarker({ center, top, text }: { center: number; top: number; text: string }) {
  const { x, anchor } = fit(center, text);
  return (
    <g>
      <line
        x1={center}
        x2={center}
        y1={15}
        y2={top - 2}
        className="stroke-[var(--ink)]"
        strokeWidth={1}
      />
      <text x={x} y={11} textAnchor={anchor} className="fill-[var(--ink)] text-[10px] font-medium">
        {text}
      </text>
    </g>
  );
}

/**
 * One distribution: a neutral bar per bin, the selected song's bin in full ink with a "this song" marker (so the
 * emphasis is never colour alone), every bin hoverable across its whole column.
 */
export function RepertoireStatsHistogram({ bins, label, thisSong }: Props) {
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const baseline = PAD_TOP + plotHeight;
  const slot = (WIDTH - PAD_LEFT) / bins.length;
  const barWidth = Math.max(slot - GAP, 1);
  const max = Math.max(...bins.map((bin) => bin.count), 1);
  const every = Math.ceil(bins.length / MAX_X_LABELS);
  const bars = bins.map((bin, i) => {
    const x = PAD_LEFT + i * slot + GAP / 2;
    const height = (bin.count / max) * plotHeight;
    return { bin, i, x, height, top: baseline - height, center: x + barWidth / 2 };
  });
  const selected = bars.find(({ bin }) => bin.isSelected);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="block h-auto w-full"
      role="img"
      aria-label={label}
    >
      <text x={0} y={PAD_TOP + 8} className="fill-[var(--ink-4)] font-mono text-[10px]">
        {max}
      </text>
      <line x1={PAD_LEFT} x2={WIDTH} y1={baseline} y2={baseline} className="stroke-[var(--rule)]" />
      {bars.map(({ bin, i, x, height, top, center }) => (
        <g key={bin.label}>
          {height > 0 && (
            <path
              d={barPath(x, top, barWidth, height)}
              className={bin.isSelected ? 'fill-[var(--ink)]' : 'fill-[var(--ink-4)]'}
            />
          )}
          {i % every === 0 && <AxisLabel center={center} text={bin.label} />}
          <rect x={x - GAP / 2} y={PAD_TOP} width={slot} height={plotHeight} fill="transparent">
            <title>{`${bin.label}: ${bin.count}`}</title>
          </rect>
        </g>
      ))}
      {selected && <SelectedMarker center={selected.center} top={selected.top} text={thisSong} />}
    </svg>
  );
}
