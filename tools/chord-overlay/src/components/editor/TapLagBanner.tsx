interface Props {
  offsetMs: number;
  confidence: number;
  onApply: () => void;
  onDismiss: () => void;
}

export function TapLagBanner({ offsetMs, confidence, onApply, onDismiss }: Props) {
  const sign = offsetMs > 0 ? "late" : "early";
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs">
      <div>
        <span className="font-semibold text-amber-800">
          Looks like your taps are ~{Math.abs(offsetMs)} ms {sign}
        </span>
        <span className="ml-2 text-amber-700">
          ({Math.round(confidence * 100)}% confidence) — apply a global nudge?
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onApply}
          className="rounded bg-amber-600 px-2 py-1 font-semibold text-white hover:bg-amber-500"
        >Apply −{Math.abs(offsetMs)}ms</button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded px-2 py-1 text-amber-700 hover:bg-amber-100"
        >Dismiss</button>
      </div>
    </div>
  );
}
