"use client";

interface Props {
  affectedCount: number;
  currentTime: number;
  onShift: (deltaMs: number) => void;
}

const STEPS_MS = [-200, -100, -50, 50, 100, 200];

// Bulk-nudge every marker at or after the playhead. Pure-UI; the parent
// resolves which markers are affected and performs the time edit.
export function BulkShiftBar({ affectedCount, currentTime, onShift }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px]">
      <span className="font-mono text-stone-500">
        Shift {affectedCount} marker{affectedCount === 1 ? "" : "s"} ≥ {currentTime.toFixed(2)}s
      </span>
      <div className="ml-auto flex items-center gap-0.5">
        {STEPS_MS.map((ms) => (
          <button
            key={ms}
            type="button"
            disabled={affectedCount === 0}
            onClick={() => onShift(ms)}
            className="rounded border border-stone-200 px-1.5 py-0.5 font-mono text-stone-700 hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-30"
            title={`Shift by ${ms > 0 ? "+" : ""}${ms}ms`}
          >{ms > 0 ? "+" : ""}{ms}</button>
        ))}
      </div>
    </div>
  );
}
