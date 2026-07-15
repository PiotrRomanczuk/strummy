import { Panel } from "../ui/Panel";
import { Field } from "../ui/Field";

export function DisplayPanel({
  watermark, bpmDisplay, capoDisplay,
  onWatermark, onBpm, onCapo,
}: {
  watermark: string;
  bpmDisplay: number | undefined;
  capoDisplay: number | undefined;
  onWatermark: (v: string) => void;
  onBpm: (v: number | undefined) => void;
  onCapo: (v: number | undefined) => void;
}) {
  const inputCls =
    "w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-orange-500 focus:outline-none";
  return (
    <Panel title="Display" subtitle="Text, tempo, capo">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Watermark">
          <input
            type="text"
            value={watermark}
            onChange={(e) => onWatermark(e.target.value)}
            placeholder="@yourhandle"
            className={inputCls}
          />
        </Field>
        <Field label="BPM (display)">
          <input
            type="number" min={0} max={300}
            value={bpmDisplay ?? ""}
            onChange={(e) => onBpm(e.target.value === "" ? undefined : Number(e.target.value))}
            placeholder="—"
            className={inputCls}
          />
        </Field>
        <Field label="Capo (display)">
          <input
            type="number" min={0} max={12}
            value={capoDisplay ?? ""}
            onChange={(e) => onCapo(e.target.value === "" ? undefined : Number(e.target.value))}
            placeholder="0"
            className={inputCls}
          />
        </Field>
      </div>
    </Panel>
  );
}
