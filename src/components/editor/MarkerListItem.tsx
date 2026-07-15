"use client";

import type { ChordMarker, ChordVoicing, TabColumn } from "@/lib/types";
import { MarkerInlineEditor } from "./MarkerInlineEditor";
import { TabPatternEditor } from "./TabPatternEditor";

interface Props {
  index: number;
  marker: ChordMarker;
  voicing: ChordVoicing | undefined;
  knownChords: string[];
  isEditing: boolean;
  isTabEditing: boolean;
  chordColor: (name: string) => string;
  onSeek: (t: number) => void;
  onRemove: (id: string) => void;
  onStartEdit: (id: string) => void;
  onStartTab: (id: string) => void;
  onCloseEdit: () => void;
  onChord: (id: string, chord: string) => void;
  onLyric: (id: string, lyric: string) => void;
  onTab: (id: string, tab: TabColumn[] | undefined) => void;
}

export function MarkerListItem({
  index, marker: m, voicing, knownChords, isEditing, isTabEditing,
  chordColor, onSeek, onRemove, onStartEdit, onStartTab, onCloseEdit,
  onChord, onLyric, onTab,
}: Props) {
  return (
    <li className="border-b border-stone-100 last:border-b-0">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className="w-6 text-right font-mono text-stone-400">{index + 1}</span>
        <button
          type="button"
          onClick={() => onStartEdit(m.id)}
          className="w-16 cursor-pointer text-left font-mono font-bold"
          style={{ color: chordColor(m.chord) }}
          title="Click to edit chord/lyric"
        >
          {m.chord}
        </button>
        <span className="flex-1 truncate text-stone-600">
          {m.lyric || <em className="text-stone-300">no lyric</em>}
        </span>
        <button
          type="button"
          onClick={() => onStartTab(m.id)}
          className={`rounded px-1.5 py-0.5 font-mono text-[10px] transition ${
            m.tab
              ? "bg-emerald-100 text-emerald-700"
              : "bg-stone-100 text-stone-500 hover:bg-stone-200"
          }`}
          title="Edit per-marker TAB pattern"
        >TAB{m.tab ? " ●" : ""}</button>
        <button
          type="button"
          onClick={() => onSeek(m.time)}
          className="font-mono text-stone-500 hover:text-stone-800"
        >{m.time.toFixed(2)}s</button>
        <button
          type="button"
          onClick={() => onRemove(m.id)}
          className="text-stone-400 hover:text-red-500"
          title="Remove marker"
        >✕</button>
      </div>
      {isEditing && (
        <MarkerInlineEditor
          marker={m}
          knownChords={knownChords}
          onChord={(c) => onChord(m.id, c)}
          onLyric={(l) => onLyric(m.id, l)}
          onClose={onCloseEdit}
        />
      )}
      {isTabEditing && (
        <div className="border-t border-stone-100 bg-stone-50 px-3 py-3">
          <TabPatternEditor
            pattern={m.tab}
            voicing={voicing}
            onChange={(t) => onTab(m.id, t)}
          />
        </div>
      )}
    </li>
  );
}
