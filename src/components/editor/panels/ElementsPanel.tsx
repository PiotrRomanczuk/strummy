import type { ElementToggles } from "@/lib/types";
import { Panel } from "../ui/Panel";
import { Toggle } from "../ui/Toggle";

const ELEMENT_LABELS: { key: keyof ElementToggles; label: string; hint: string }[] = [
  { key: "strum", label: "Strum row", hint: "Animated 8-step pattern" },
  { key: "tab", label: "TAB row", hint: "Per-marker fingerstyle TAB (when set)" },
  { key: "next", label: "Next chord", hint: "Preview the upcoming change" },
  { key: "lyrics", label: "Lyric strip", hint: "Lower-third lyric display" },
  { key: "watermark", label: "Watermark", hint: "Handle / username badge" },
  { key: "meta", label: "Capo · BPM", hint: "Tuning + tempo metadata" },
];

interface Props {
  elements: ElementToggles;
  onToggle: (key: keyof ElementToggles, value: boolean) => void;
  tabMarkerCount: number;
}

export function ElementsPanel({ elements, onToggle, tabMarkerCount }: Props) {
  return (
    <Panel title="Elements" subtitle="Toggle individual overlay parts">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ELEMENT_LABELS.map(({ key, label, hint }) => (
          <Toggle
            key={key}
            label={label}
            hint={hint}
            checked={elements[key]}
            onChange={(v) => onToggle(key, v)}
          />
        ))}
      </div>
      {elements.tab && tabMarkerCount === 0 && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          TAB row is on but no marker has a tab pattern yet. Click a marker&apos;s
          <span className="mx-1 rounded bg-emerald-100 px-1 font-mono text-emerald-700">TAB</span>
          button below to add one.
        </p>
      )}
    </Panel>
  );
}
