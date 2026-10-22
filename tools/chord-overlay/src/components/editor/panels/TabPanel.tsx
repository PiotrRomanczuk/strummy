"use client";

import type {
  ChordMarker, ChordVoicing, TabColumn, TabDisplay, TabPosition, TabSize,
} from "@/lib/types";
import { tabFromVoicing } from "@/lib/tabUtils";
import { Panel } from "../ui/Panel";
import { Field } from "../ui/Field";
import { Toggle } from "../ui/Toggle";

interface Props {
  markers: ChordMarker[];                  // pre-sorted
  voicings: Record<string, ChordVoicing>;
  tabDisplay: TabDisplay;
  onTabDisplay: (next: TabDisplay) => void;
  onTab: (id: string, tab: TabColumn[] | undefined) => void;
  onSeek: (time: number) => void;
  onJumpToMarker: (id: string) => void;    // open inline TAB editor in the timeline
}

const SIZE_OPTIONS: { value: TabSize; label: string }[] = [
  { value: "sm", label: "S" },
  { value: "md", label: "M" },
  { value: "lg", label: "L" },
];

const POSITION_OPTIONS: { value: TabPosition; label: string }[] = [
  { value: "inline", label: "Inline" },
  { value: "below", label: "Below" },
  { value: "top-right", label: "Top R" },
  { value: "bottom-left", label: "Bot L" },
  { value: "lyrics-strip", label: "Lyrics" },
  { value: "strip", label: "Strip" },
];

export function TabPanel({
  markers, voicings, tabDisplay, onTabDisplay, onTab, onSeek, onJumpToMarker,
}: Props) {
  const withTab = markers.filter((m) => m.tab && m.tab.length > 0);
  const withoutTab = markers.length - withTab.length;

  const seedAllMissing = () => {
    for (const m of markers) {
      if (m.tab) continue;
      const v = voicings[m.chord];
      if (v) onTab(m.id, tabFromVoicing(v));
    }
  };
  const clearAll = () => {
    for (const m of withTab) onTab(m.id, undefined);
  };
  const propagateChord = (chord: string, pattern: TabColumn[]) => {
    for (const m of markers) {
      if (m.chord === chord && !m.tab) onTab(m.id, pattern);
    }
  };

  return (
    <Panel title="TAB management" subtitle={`${withTab.length}/${markers.length} markers tabbed`}>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Size">
          <Segmented
            options={SIZE_OPTIONS}
            value={tabDisplay.size}
            onChange={(size) => onTabDisplay({ ...tabDisplay, size })}
          />
        </Field>
        <Field label="Position">
          <Segmented
            options={POSITION_OPTIONS}
            value={tabDisplay.position}
            onChange={(position) => onTabDisplay({ ...tabDisplay, position })}
          />
        </Field>
        <div className="flex items-end">
          <Toggle
            label="Lookahead"
            hint="Preview next chord's tab"
            checked={tabDisplay.lookahead}
            onChange={(lookahead) => onTabDisplay({ ...tabDisplay, lookahead })}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={seedAllMissing}
          disabled={withoutTab === 0}
          className="rounded border border-stone-200 px-2 py-1 text-[11px] text-stone-700 hover:border-stone-400 disabled:opacity-40"
          title="Generate Travis-style tabs from each marker's voicing"
        >Seed missing ({withoutTab})</button>
        <button
          type="button"
          onClick={clearAll}
          disabled={withTab.length === 0}
          className="rounded border border-stone-200 px-2 py-1 text-[11px] text-stone-700 hover:border-red-400 hover:text-red-600 disabled:opacity-40"
        >Clear all</button>
      </div>

      {markers.length === 0 ? (
        <p className="mt-3 text-[11px] text-stone-500">No markers yet — stamp chord changes first, then come back to add tab patterns.</p>
      ) : (
        <ul className="mt-3 max-h-72 overflow-y-auto rounded-md border border-stone-200 bg-white text-[11px]">
          {markers.map((m, i) => (
            <TabRowItem
              key={m.id}
              index={i}
              marker={m}
              hasVoicing={!!voicings[m.chord]}
              onSeek={() => onSeek(m.time)}
              onEdit={() => onJumpToMarker(m.id)}
              onClear={() => onTab(m.id, undefined)}
              onSeed={() => {
                const v = voicings[m.chord];
                if (v) onTab(m.id, tabFromVoicing(v));
              }}
              onPropagate={() => {
                if (m.tab) propagateChord(m.chord, m.tab);
              }}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function TabRowItem({
  index, marker, hasVoicing, onSeek, onEdit, onClear, onSeed, onPropagate,
}: {
  index: number;
  marker: ChordMarker;
  hasVoicing: boolean;
  onSeek: () => void;
  onEdit: () => void;
  onClear: () => void;
  onSeed: () => void;
  onPropagate: () => void;
}) {
  const has = !!marker.tab;
  return (
    <li className="flex items-center gap-2 border-b border-stone-100 px-2 py-1.5 last:border-b-0">
      <span className="w-5 text-right font-mono text-stone-400">{index + 1}</span>
      <span className={`w-14 truncate font-mono font-bold ${has ? "text-emerald-700" : "text-stone-700"}`}>
        {marker.chord}
      </span>
      <button
        type="button"
        onClick={onSeek}
        className="w-14 text-left font-mono text-stone-500 hover:text-stone-800"
      >{marker.time.toFixed(2)}s</button>
      <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
        has ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-400"
      }`}>
        {has ? `${marker.tab!.length}c` : "—"}
      </span>
      <span className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="rounded border border-stone-200 px-1.5 py-0.5 text-stone-700 hover:border-orange-400"
          title="Edit pattern"
        >Edit</button>
        <button
          type="button"
          onClick={onSeed}
          disabled={!hasVoicing}
          className="rounded border border-stone-200 px-1.5 py-0.5 text-stone-700 hover:border-stone-400 disabled:opacity-30"
          title={hasVoicing ? "Seed from chord voicing" : "No voicing for this chord"}
        >Seed</button>
        <button
          type="button"
          onClick={onPropagate}
          disabled={!has}
          className="rounded border border-stone-200 px-1.5 py-0.5 text-stone-700 hover:border-stone-400 disabled:opacity-30"
          title={`Apply this tab to all empty ${marker.chord} markers`}
        >Apply→{marker.chord}</button>
        <button
          type="button"
          onClick={onClear}
          disabled={!has}
          className="text-stone-400 hover:text-red-500 disabled:opacity-30"
          title="Clear pattern"
        >✕</button>
      </span>
    </li>
  );
}

function Segmented<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex w-full overflow-hidden rounded-md border border-stone-200">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 px-1.5 py-1 text-[11px] font-medium transition ${
              active ? "bg-orange-500 text-white" : "bg-white text-stone-600 hover:bg-stone-100"
            }`}
          >{o.label}</button>
        );
      })}
    </div>
  );
}
