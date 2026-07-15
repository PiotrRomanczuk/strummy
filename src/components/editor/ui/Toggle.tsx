export function Toggle({
  label, hint, checked, onChange,
}: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between rounded-md border px-3 py-2 text-left transition ${
        checked
          ? "border-orange-400 bg-orange-50"
          : "border-stone-200 bg-white hover:border-stone-300"
      }`}
    >
      <div>
        <div className={`text-sm font-medium ${checked ? "text-orange-800" : "text-stone-800"}`}>{label}</div>
        {hint && <div className="text-[11px] text-stone-500">{hint}</div>}
      </div>
      <span className={`relative inline-block h-5 w-9 rounded-full transition ${
        checked ? "bg-orange-500" : "bg-stone-300"
      }`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
          checked ? "left-[18px]" : "left-0.5"
        }`} />
      </span>
    </button>
  );
}
