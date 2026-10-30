"use client";

import { useState } from "react";
import type { ChordVoicing } from "@/lib/types";
import { voicingFor } from "@/lib/chordLibrary";
import { chordColor } from "@/lib/chordColor";
import { Panel } from "../ui/Panel";
import { ChordVoicingEditor } from "../ChordVoicingEditor";

export function VoicingsPanel({
  uniqueChords, voicings, onChange,
}: {
  uniqueChords: string[];
  voicings: Record<string, ChordVoicing>;
  onChange: (chord: string, voicing: ChordVoicing) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <Panel title="Chord voicings" subtitle="Per-song overrides">
      {uniqueChords.length === 0 ? (
        <p className="text-xs text-stone-500">Paste a chord sheet first.</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {uniqueChords.map((name) => {
              const c = chordColor(name);
              const isEditing = editing === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setEditing(isEditing ? null : name)}
                  className="rounded-md border-2 px-3 py-1.5 font-mono text-sm font-bold text-white transition"
                  style={{
                    background: c,
                    borderColor: isEditing ? "#0a0a0a" : c,
                  }}
                >{name}</button>
              );
            })}
          </div>
          {editing && (
            <div className="min-w-0 overflow-hidden rounded-md border border-stone-200 bg-stone-50 p-3">
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="font-mono text-sm font-bold text-orange-700">{editing}</h3>
                <span className="text-[10px] uppercase tracking-wider text-stone-400">
                  per-song voicing
                </span>
              </div>
              <ChordVoicingEditor
                voicing={voicings[editing] ?? voicingFor(editing)}
                onChange={(v) => onChange(editing, v)}
                onReset={() => onChange(editing, voicingFor(editing))}
              />
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
