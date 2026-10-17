interface Props {
  pending: boolean;
  error: string | null;
  onRetry: () => void;
}

export function SaveIndicator({ pending, error, onRetry }: Props) {
  if (error) {
    return (
      <div className="flex items-center gap-2 font-mono text-xs">
        <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
        <span className="text-red-700" title={error}>save failed</span>
        <button
          type="button"
          onClick={onRetry}
          className="rounded border border-red-300 px-2 py-0.5 text-[10px] uppercase tracking-wider text-red-700 hover:border-red-500"
        >Retry</button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 font-mono text-xs text-stone-500">
      <span className={`inline-block h-2 w-2 rounded-full transition ${
        pending ? "animate-pulse bg-orange-500" : "bg-emerald-500"
      }`} />
      {pending ? "saving…" : "saved"}
    </div>
  );
}
