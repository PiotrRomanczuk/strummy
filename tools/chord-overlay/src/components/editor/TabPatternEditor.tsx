"use client";

import { useState, useCallback } from "react";
import type { ChordVoicing, TabColumn, TabLength } from "@/lib/types";
import { TAB_LENGTHS } from "@/lib/types";
import { emptyTabPattern, isEmptyTabPattern, resizeTabPattern, setTabCell, tabFromVoicing } from "@/lib/tabUtils";
import { TabRow } from "@/components/overlay/TabRow";
import { useTabClipboard } from "./hooks/useTabClipboard";

interface Props {
  pattern: TabColumn[] | undefined;
  voicing: ChordVoicing | undefined;
  onChange: (next: TabColumn[] | undefined) => void;
}

const STRINGS = ["e", "B", "G", "D", "A", "E"];   // top row = high e
const STRING_ORDER = [5, 4, 3, 2, 1, 0];           // index into TabColumn

function asTabLength(n: number): TabLength {
  return ((TAB_LENGTHS as readonly number[]).includes(n) ? n : 8) as TabLength;
}

export function TabPatternEditor({ pattern, voicing, onChange }: Props) {
  const grid: TabColumn[] = pattern ?? emptyTabPattern(8);
  const cols = grid.length;
  const [editing, setEditing] = useState<{ col: number; row: number } | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const { clipboard, copy } = useTabClipboard();

  const commitCell = useCallback((col: number, stringIdx: number, value: number | null) => {
    const next = setTabCell(grid, col, stringIdx, value);
    onChange(next);
  }, [grid, onChange]);

  const move = useCallback((dCol: number, dRow: number) => {
    if (!editing) return;
    const rowOrder = STRING_ORDER;
    const curRowPos = rowOrder.indexOf(editing.row);
    const nextCol = Math.max(0, Math.min(cols - 1, editing.col + dCol));
    const nextRowPos = Math.max(0, Math.min(rowOrder.length - 1, curRowPos + dRow));
    setEditing({ col: nextCol, row: rowOrder[nextRowPos] });
  }, [editing, cols]);

  const seedFromChord = () => {
    if (voicing) onChange(tabFromVoicing(voicing));
  };

  const setLength = (n: TabLength) => {
    onChange(resizeTabPattern(grid, n));
  };

  const pasteClipboard = () => {
    if (clipboard) onChange(clipboard);
  };

  const empty = isEmptyTabPattern(grid);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-stone-500">
          TAB · 6 strings × {cols} sub-beats
        </span>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-stone-500">
          <span className="uppercase tracking-wider">cols</span>
          {(TAB_LENGTHS as readonly number[]).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setLength(asTabLength(n))}
              className={`rounded px-1.5 py-0.5 font-mono ${
                cols === n
                  ? "bg-orange-100 text-orange-700"
                  : "bg-stone-100 text-stone-500 hover:bg-stone-200"
              }`}
            >{n}</button>
          ))}
        </span>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1 text-[11px]">
        <button
          type="button"
          onClick={seedFromChord}
          disabled={!voicing}
          className="rounded border border-stone-200 px-2 py-0.5 text-stone-700 hover:border-stone-400 disabled:opacity-40"
          title="Travis-style fill from this chord's voicing"
        >Seed from chord</button>
        <button
          type="button"
          onClick={() => copy(grid)}
          disabled={empty}
          className="rounded border border-stone-200 px-2 py-0.5 text-stone-700 hover:border-stone-400 disabled:opacity-40"
        >Copy</button>
        <button
          type="button"
          onClick={pasteClipboard}
          disabled={!clipboard}
          className="rounded border border-stone-200 px-2 py-0.5 text-stone-700 hover:border-stone-400 disabled:opacity-40"
          title={clipboard ? `Paste ${clipboard.length}-col pattern` : "Clipboard empty"}
        >Paste</button>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          disabled={empty}
          className="ml-auto rounded px-2 py-0.5 text-stone-500 hover:text-red-500 disabled:opacity-30"
        >Clear</button>
      </div>

      <div className="grid gap-0.5" style={{ gridTemplateColumns: `28px repeat(${cols}, 1fr)` }}>
        {STRING_ORDER.map((stringIdx, rowIdx) => (
          <Row
            key={stringIdx}
            label={STRINGS[rowIdx]}
            hint={rowIdx === 0 ? "high" : rowIdx === 5 ? "low" : undefined}
            cols={grid}
            stringIdx={stringIdx}
            editing={editing}
            onSelect={(c) => setEditing({ col: c, row: stringIdx })}
            onCommit={(c, v) => { commitCell(c, stringIdx, v); setEditing(null); }}
            onMove={move}
          />
        ))}
      </div>

      <div className="mt-3 rounded-md border border-stone-200 bg-white p-2">
        <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-stone-500">
          <span>Live preview</span>
          <input
            type="range"
            min={0} max={1000} value={Math.round(previewProgress * 1000)}
            onChange={(e) => setPreviewProgress(Number(e.target.value) / 1000)}
            className="ml-3 flex-1 accent-orange-500"
          />
        </div>
        <TabRow pattern={grid} progress={previewProgress} size="sm" />
      </div>

      <p className="mt-2 text-[10px] text-stone-400">
        Click a cell, type a fret number (0–24), Enter / arrow keys to move, Esc to cancel.
      </p>
    </div>
  );
}

function Row({
  label, hint, cols, stringIdx, editing, onSelect, onCommit, onMove,
}: {
  label: string;
  hint?: string;
  cols: TabColumn[];
  stringIdx: number;
  editing: { col: number; row: number } | null;
  onSelect: (col: number) => void;
  onCommit: (col: number, value: number | null) => void;
  onMove: (dCol: number, dRow: number) => void;
}) {
  return (
    <>
      <div
        className="flex items-center justify-end gap-1 pr-1 font-mono text-[11px] font-bold text-stone-500"
        title={hint ? `${label} (${hint})` : label}
      >
        {hint && <span className="text-[8px] uppercase tracking-wider text-stone-400">{hint}</span>}
        <span>{label}</span>
      </div>
      {cols.map((c, ci) => {
        const v = c[stringIdx];
        const isEditing = editing?.col === ci && editing.row === stringIdx;
        if (isEditing) {
          return (
            <FretInput
              key={ci}
              initial={v}
              onCommit={(next) => onCommit(ci, next)}
              onCancel={() => onCommit(ci, v)}
              onMove={onMove}
            />
          );
        }
        return (
          <button
            key={ci}
            type="button"
            onClick={() => onSelect(ci)}
            className={`h-7 rounded text-center font-mono text-xs transition ${
              v == null
                ? "bg-stone-100 text-stone-300 hover:bg-stone-200"
                : "bg-orange-500 text-white"
            }`}
          >
            {v == null ? "·" : v}
          </button>
        );
      })}
    </>
  );
}

function FretInput({
  initial, onCommit, onCancel, onMove,
}: {
  initial: number | null;
  onCommit: (v: number | null) => void;
  onCancel: () => void;
  onMove: (dCol: number, dRow: number) => void;
}) {
  const [value, setValue] = useState(initial == null ? "" : String(initial));
  const parse = (s: string): number | null => {
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 && n <= 24 ? n : initial;
  };
  return (
    <input
      autoFocus
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
      onBlur={() => onCommit(parse(value))}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          onCommit(parse(value));
          onMove(e.shiftKey ? -1 : 1, 0);
        } else if (e.key === "Escape") {
          setValue(initial == null ? "" : String(initial));
          onCancel();
        } else if (e.key === "ArrowRight") {
          e.preventDefault(); onCommit(parse(value)); onMove(1, 0);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault(); onCommit(parse(value)); onMove(-1, 0);
        } else if (e.key === "ArrowUp") {
          e.preventDefault(); onCommit(parse(value)); onMove(0, -1);
        } else if (e.key === "ArrowDown") {
          e.preventDefault(); onCommit(parse(value)); onMove(0, 1);
        }
      }}
      className="h-7 w-full rounded border border-orange-500 bg-white text-center font-mono text-xs text-stone-800 focus:outline-none"
    />
  );
}
