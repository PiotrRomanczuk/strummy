"use client";

import { useState } from "react";
import type { ChordVoicing } from "@/lib/types";
import { ChordDiagram } from "@/components/overlay/ChordDiagram";

interface Props {
  voicing: ChordVoicing;
  onChange: (next: ChordVoicing) => void;
  onReset?: () => void;
}

const STRING_LABELS = ["E", "A", "D", "G", "B", "e"];
const FRETS_TO_SHOW = 5;

export function ChordVoicingEditor({ voicing, onChange, onReset }: Props) {
  const [activeFinger, setActiveFinger] = useState<number>(1);

  const setFret = (stringIdx: number, fret: number) => {
    const frets = [...voicing.frets];
    const fingers = [...voicing.fingers];
    frets[stringIdx] = fret;
    if (fret <= 0) fingers[stringIdx] = 0;
    else if (fingers[stringIdx] === 0) fingers[stringIdx] = activeFinger;
    onChange({ ...voicing, frets, fingers });
  };
  const setFinger = (stringIdx: number, finger: number) => {
    const fingers = [...voicing.fingers];
    fingers[stringIdx] = finger;
    onChange({ ...voicing, fingers });
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-md bg-white p-2 ring-1 ring-stone-200">
          <ChordDiagram voicing={voicing} size={112} />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-stone-500">Active finger</span>
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setActiveFinger(n)}
                className={`h-6 w-6 rounded-full border text-[11px] font-bold transition ${
                  activeFinger === n
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:border-stone-400"
                }`}
              >{n}</button>
            ))}
          </div>
          <p className="text-[10px] leading-tight text-stone-400">
            Click a fret on the grid below to place this finger.
          </p>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="self-start rounded border border-stone-200 bg-white px-2 py-1 text-[11px] text-stone-600 hover:border-stone-300 hover:text-stone-900"
            >Reset to default</button>
          )}
        </div>
      </div>

      <div className="min-w-0 space-y-2">
        <div className="grid select-none grid-cols-[28px_repeat(6,minmax(0,1fr))] gap-1 text-center">
          <div />
          {STRING_LABELS.map((s, i) => (
            <div key={i} className="font-mono text-[11px] font-bold text-stone-500">{s}</div>
          ))}
          <div className="self-center font-mono text-[9px] uppercase text-stone-400">×/○</div>
          {voicing.frets.map((f, i) => (
            <div key={`m${i}`} className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => setFret(i, -1)}
                className={`rounded py-0.5 text-[11px] font-bold ${
                  f === -1 ? "bg-red-200 text-red-800" : "bg-stone-100 text-stone-400 hover:bg-stone-200"
                }`}
              >×</button>
              <button
                type="button"
                onClick={() => setFret(i, 0)}
                className={`rounded py-0.5 text-[11px] font-bold ${
                  f === 0 ? "bg-emerald-200 text-emerald-800" : "bg-stone-100 text-stone-400 hover:bg-stone-200"
                }`}
              >○</button>
            </div>
          ))}
          {Array.from({ length: FRETS_TO_SHOW }, (_, fi) => fi + 1).map((fret) => (
            <FretRow key={fret} fret={fret} voicing={voicing} onPick={setFret} />
          ))}
        </div>

        <div className="grid grid-cols-[28px_repeat(6,minmax(0,1fr))] items-center gap-1 border-t border-stone-200 pt-2 text-center text-xs">
          <div className="font-mono text-[10px] uppercase text-stone-500">fgr</div>
          {voicing.fingers.map((finger, i) => (
            <select
              key={i}
              value={finger}
              onChange={(e) => setFinger(i, Number(e.target.value))}
              disabled={voicing.frets[i] <= 0}
              className="w-full min-w-0 rounded border border-stone-200 bg-white py-0.5 text-center font-mono text-[11px] text-stone-800 disabled:opacity-30"
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n === 0 ? "—" : n}</option>
              ))}
            </select>
          ))}
        </div>
      </div>
    </div>
  );
}

function FretRow({
  fret, voicing, onPick,
}: {
  fret: number;
  voicing: ChordVoicing;
  onPick: (stringIdx: number, fret: number) => void;
}) {
  return (
    <>
      <div className="self-center font-mono text-[11px] text-stone-500">{fret}</div>
      {voicing.frets.map((f, i) => {
        const active = f === fret;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onPick(i, active ? 0 : fret)}
            title={`String ${STRING_LABELS[i]}, fret ${fret}`}
            className={`h-7 rounded border text-[11px] font-bold transition ${
              active
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-stone-200 bg-white text-stone-300 hover:border-stone-400 hover:text-stone-600"
            }`}
          >
            {active && voicing.fingers[i] > 0 ? voicing.fingers[i] : ""}
          </button>
        );
      })}
    </>
  );
}
