"use client";

import type { StrumStep } from "@/lib/types";

interface Props {
  pattern: StrumStep[];
  onChange: (next: StrumStep[]) => void;
}

const CYCLE: StrumStep[] = ["D", "U", "-"];
const ARROW: Record<StrumStep, string> = { D: "↓", U: "↑", "-": "·" };
const LABEL: Record<StrumStep, string> = { D: "down", U: "up", "-": "rest" };

export function StrumPatternEditor({ pattern, onChange }: Props) {
  const setAt = (i: number, value: StrumStep) => {
    const next = [...pattern];
    next[i] = value;
    onChange(next);
  };
  const cycle = (i: number) => {
    const cur = pattern[i];
    const idx = CYCLE.indexOf(cur);
    setAt(i, CYCLE[(idx + 1) % CYCLE.length]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        {pattern.map((step, i) => (
          <button
            key={i}
            type="button"
            onClick={() => cycle(i)}
            title={`Beat ${i + 1} — ${LABEL[step]}. Click to cycle.`}
            className={`flex h-16 flex-1 flex-col items-center justify-center rounded-md border text-2xl font-bold transition ${
              step === "-"
                ? "border-stone-200 bg-stone-50 text-stone-400 hover:border-stone-300"
                : step === "D"
                ? "border-orange-400 bg-orange-50 text-orange-700 hover:bg-orange-100"
                : "border-sky-400 bg-sky-50 text-sky-700 hover:bg-sky-100"
            }`}
          >
            <span>{ARROW[step]}</span>
            <span className="font-mono text-[10px] font-medium opacity-60">{i + 1}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
        <span>Presets:</span>
        <PresetButton label="Folk D-DU-UDU" pattern={["D","-","D","U","-","U","D","U"]} onChange={onChange} />
        <PresetButton label="All down" pattern={["D","D","D","D","D","D","D","D"]} onChange={onChange} />
        <PresetButton label="Up-down" pattern={["D","U","D","U","D","U","D","U"]} onChange={onChange} />
        <PresetButton label="Off-beat" pattern={["-","D","-","U","-","D","-","U"]} onChange={onChange} />
      </div>
    </div>
  );
}

function PresetButton({
  label, pattern, onChange,
}: { label: string; pattern: StrumStep[]; onChange: (p: StrumStep[]) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(pattern)}
      className="rounded border border-stone-200 bg-white px-2 py-1 text-xs text-stone-700 hover:border-stone-300"
    >
      {label}
    </button>
  );
}
