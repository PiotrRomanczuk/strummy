import type { VariationId } from "@/lib/types";
import { Panel } from "../ui/Panel";

const VARIATIONS: { id: VariationId; label: string; blurb: string }[] = [
  { id: "clean", label: "Clean Studio", blurb: "Broadcast / educational. White card, slim lyric strip." },
  { id: "notebook", label: "Notebook & Tape", blurb: "Cream paper, washi tape, hand-feel." },
  { id: "chyron", label: "Bold Chyron", blurb: "Modern music-doc lower-third. Amber accent." },
];

export function VariationPanel({
  value, onChange,
}: { value: VariationId; onChange: (id: VariationId) => void }) {
  return (
    <Panel title="Variation">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {VARIATIONS.map((v) => {
          const active = value === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onChange(v.id)}
              className={`rounded-lg border p-3 text-left transition ${
                active
                  ? "border-orange-500 bg-orange-50"
                  : "border-stone-200 bg-white hover:border-stone-300"
              }`}
            >
              <div className={`text-sm font-semibold ${active ? "text-orange-700" : "text-stone-800"}`}>
                {v.label}
              </div>
              <div className="mt-1 text-xs text-stone-500">{v.blurb}</div>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
