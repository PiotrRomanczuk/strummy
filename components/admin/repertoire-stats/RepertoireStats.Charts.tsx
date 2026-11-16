/**
 * Distribution charts of the repertoire statistics: a histogram for many songs, one point per song for few, and
 * the twelve keys with major and minor stacked. The highlighted song's label sits in its own band above the
 * marks, so no bar ever covers it.
 */

type Bin = { label: string; count: number; isSelected: boolean; title: string };

function HighlightBand({ left, text }: { left: number; text: string | null }) {
  if (!text) return <div className="h-[30px]" />;
  return (
    <div className="relative h-[30px]">
      <div
        className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[12px] font-medium"
        style={{ left: `clamp(70px, ${left}%, calc(100% - 70px))` }}
      >
        {text}
      </div>
      <div
        className="absolute top-[19px] h-[11px] border-l border-[var(--ink)]"
        style={{ left: `${left}%` }}
      />
    </div>
  );
}

/** Every `every`-th label is printed, and always the highlighted one. */
export function Histogram({
  bins,
  highlight,
  every = 1,
}: {
  bins: Bin[];
  highlight: string | null;
  every?: number;
}) {
  const max = Math.max(1, ...bins.map((bin) => bin.count));
  const selected = bins.findIndex((bin) => bin.isSelected);
  return (
    <div>
      <HighlightBand
        left={((selected + 0.5) / Math.max(bins.length, 1)) * 100}
        text={selected >= 0 ? highlight : null}
      />
      <div className="flex h-[120px] items-end gap-[3px] border-b border-[var(--rule)]">
        {bins.map((bin) => (
          <div
            key={bin.label}
            title={bin.title}
            className={`flex-1 rounded-t-[2px] ${bin.isSelected ? 'bg-[var(--ink)]' : 'bg-[var(--ink-5)]'}`}
            style={{ height: `${Math.max((bin.count / max) * 100, 1.5)}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex gap-[3px]">
        {bins.map((bin, i) => (
          <div
            key={bin.label}
            className={`flex-1 whitespace-nowrap text-center font-mono text-[10px] ${bin.isSelected ? 'font-medium text-[var(--ink)]' : 'text-[var(--ink-4)]'}`}
          >
            {i % every === 0 || bin.isSelected ? bin.label : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

type Dot = { id: string; value: number; title: string; isSelected: boolean };

/** Few songs: each one a point on the axis, equal values stacked. */
export function Dots({
  dots,
  ticks,
  format,
  highlight,
}: {
  dots: Dot[];
  ticks: number[];
  format: (value: number) => string;
  highlight: string | null;
}) {
  const values = dots.map((dot) => dot.value);
  const [min, max] = [Math.min(...values, ...ticks), Math.max(...values, ...ticks)];
  const position = (value: number) => (max === min ? 50 : ((value - min) / (max - min)) * 92 + 4);
  const seen = new Map<number, number>();
  const selected = dots.find((dot) => dot.isSelected);
  return (
    <div>
      <HighlightBand
        left={selected ? position(selected.value) : 0}
        text={selected ? highlight : null}
      />
      <div className="relative h-[54px] border-b border-[var(--rule)]">
        {dots.map((dot) => {
          const stack = seen.get(dot.value) ?? 0;
          seen.set(dot.value, stack + 1);
          return (
            <div
              key={dot.id}
              title={`${dot.title}: ${format(dot.value)}`}
              className={`absolute -ml-[5.5px] size-[11px] rounded-full border-[1.5px] ${dot.isSelected ? 'border-[var(--ink)] bg-[var(--ink)]' : 'border-[var(--ink-4)] bg-[var(--card)]'}`}
              style={{ left: `${position(dot.value)}%`, bottom: 4 + stack * 14 }}
            />
          );
        })}
      </div>
      <div className="relative mt-1 h-[18px]">
        {ticks.map((tick) => (
          <span
            key={tick}
            className="absolute -translate-x-1/2 font-mono text-[10px] text-[var(--ink-4)]"
            style={{ left: `${position(tick)}%` }}
          >
            {format(tick)}
          </span>
        ))}
      </div>
    </div>
  );
}

type KeyCell = {
  pitch: number;
  label: string;
  major: number;
  minor: number;
  majorTitle: string;
  minorTitle: string;
};

/** Twelve keys: the major count filled at the bottom, the minor count outlined on top. */
export function KeyChart({
  cells,
  selected,
  highlight,
  legend,
}: {
  cells: KeyCell[];
  selected: { pitch: number; isMinor: boolean } | null;
  highlight: string | null;
  legend: { major: string; minor: string };
}) {
  const max = Math.max(1, ...cells.map((cell) => cell.major + cell.minor));
  const isOn = (cell: KeyCell, isMinor: boolean) =>
    selected?.pitch === cell.pitch && selected.isMinor === isMinor;
  const segment = (cell: KeyCell, isMinor: boolean) =>
    `${isOn(cell, isMinor) ? 'border-[var(--ink)] bg-[var(--ink)]' : isMinor ? 'border-[var(--ink-5)] bg-[var(--card)]' : 'border-[var(--ink-5)] bg-[var(--ink-5)]'}`;
  return (
    <div>
      <HighlightBand
        left={selected ? ((selected.pitch + 0.5) / 12) * 100 : 0}
        text={selected ? highlight : null}
      />
      <div className="flex h-[120px] items-end gap-1.5 border-b border-[var(--rule)]">
        {cells.map((cell) => (
          <div key={cell.pitch} className="flex h-full flex-1 flex-col justify-end gap-px">
            <div
              title={cell.minorTitle}
              className={`rounded-t-[2px] border ${segment(cell, true)}`}
              style={{ height: `${(cell.minor / max) * 100}%` }}
            />
            <div
              title={cell.majorTitle}
              className={`border ${segment(cell, false)}`}
              style={{ height: `${(cell.major / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {cells.map((cell) => (
          <div
            key={cell.pitch}
            className={`flex-1 text-center font-mono text-[10px] ${selected?.pitch === cell.pitch ? 'font-medium text-[var(--ink)]' : 'text-[var(--ink-4)]'}`}
          >
            {cell.label}
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex gap-3.5 text-[12px] text-[var(--ink-3)]">
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 bg-[var(--ink-5)]" />
          {legend.major}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 border border-[var(--ink-5)]" />
          {legend.minor}
        </span>
      </div>
    </div>
  );
}
