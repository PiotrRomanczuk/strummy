"use client";

import { useState } from "react";
import type { ChordMarker } from "@/lib/types";

export function MarkerInlineEditor({
  marker, knownChords, onChord, onLyric, onClose,
}: {
  marker: ChordMarker;
  knownChords: string[];
  onChord: (c: string) => void;
  onLyric: (l: string) => void;
  onClose: () => void;
}) {
  const [chord, setChord] = useState(marker.chord);
  const commit = (v: string) => {
    const trimmed = v.trim();
    if (!trimmed) return;
    setChord(trimmed);
    onChord(trimmed);
  };
  return (
    <div className="border-t border-stone-100 bg-stone-50 px-3 py-2">
      <div className="mb-2 flex items-center gap-2">
        <span className="w-12 text-[10px] uppercase tracking-wider text-stone-500">Chord</span>
        <input
          type="text"
          value={chord}
          onChange={(e) => setChord(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { commit((e.target as HTMLInputElement).value); onClose(); }
            if (e.key === "Escape") onClose();
          }}
          className="w-24 rounded border border-stone-200 bg-white px-2 py-1 font-mono text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
        <div className="flex flex-wrap gap-1">
          {knownChords.filter((c) => c !== marker.chord).slice(0, 12).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => commit(c)}
              className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] text-stone-700 hover:bg-stone-200"
            >{c}</button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-12 text-[10px] uppercase tracking-wider text-stone-500">Lyric</span>
        <input
          type="text"
          defaultValue={marker.lyric ?? ""}
          onBlur={(e) => onLyric(e.target.value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") { onLyric((e.target as HTMLInputElement).value.trim()); onClose(); }
            if (e.key === "Escape") onClose();
          }}
          placeholder="(none)"
          className="flex-1 rounded border border-stone-200 bg-white px-2 py-1 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>
    </div>
  );
}
