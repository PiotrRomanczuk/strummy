const ROWS: { keys: string; label: string }[] = [
  { keys: "Space", label: "Mark next chord at playhead" },
  { keys: "⇧ Space", label: "Re-time nearest marker to playhead" },
  { keys: "K", label: "Play / pause" },
  { keys: "J / L", label: "Seek −3s / +3s" },
  { keys: "[ / ]", label: "Previous / next marker" },
  { keys: "⌫ / Delete", label: "Delete nearest marker" },
  { keys: "⌘Z / ⌘⇧Z", label: "Undo / redo last marker change" },
  { keys: "?", label: "Toggle this help" },
];

export function KeyboardHelp({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-700">Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-stone-400 hover:text-stone-700"
          >Close (?)</button>
        </div>
        <ul className="space-y-2 text-sm">
          {ROWS.map((r) => (
            <li key={r.keys} className="flex items-center justify-between gap-4">
              <kbd className="rounded bg-stone-100 px-2 py-0.5 font-mono text-xs text-stone-700">{r.keys}</kbd>
              <span className="flex-1 text-right text-stone-600">{r.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
