"use client";

import { useEffect, useRef, useState } from "react";
import type { TabColumn } from "@/lib/types";

const STRING_LABELS = ["e (high)", "B", "G", "D", "A", "E (low)"];
const STRING_ORDER = [5, 4, 3, 2, 1, 0];

interface Props {
  pattern: TabColumn[];
  onCellChange: (col: number, stringIdx: number, v: number | null) => void;
  highlightCol?: number; // for live-preview cursor
}

// Editable 6×N fret grid with arrow-key navigation. Click a cell to start
// editing; arrows move between cells; Enter / Esc commit / cancel.
export function TabGrid({ pattern, onCellChange, highlightCol }: Props) {
  const cols = pattern.length;
  const [active, setActive] = useState<{ col: number; row: number } | null>(null);

  // Hold raw input draft separately so the user can clear → type without losing focus.
  const [draft, setDraft] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (active && inputRef.current) inputRef.current.focus();
  }, [active]);

  const startEdit = (col: number, row: number) => {
    const v = pattern[col][row];
    setActive({ col, row });
    setDraft(v == null ? "" : String(v));
  };

  const commit = (next: number | null) => {
    if (!active) return;
    onCellChange(active.col, active.row, next);
  };

  const move = (dCol: number, dRow: number) => {
    if (!active) return;
    let { col, row } = active;
    col = Math.max(0, Math.min(cols - 1, col + dCol));
    // Visual rows go high-e → low-E (top-down), so navigation needs to flip:
    // up arrow (dRow=-1) means "go up visually" which corresponds to
    // a higher index in STRING_ORDER's row position.
    const visual = STRING_ORDER.indexOf(row);
    const visualNext = Math.max(0, Math.min(5, visual + dRow));
    row = STRING_ORDER[visualNext];
    setActive({ col, row });
    const v = pattern[col][row];
    setDraft(v == null ? "" : String(v));
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowRight" || e.key === "Tab") {
      e.preventDefault();
      const next = draft === "" ? null : Number(draft);
      commit(Number.isFinite(next as number) && (next as number) >= 0 && (next as number) <= 24 ? next : pattern[active!.col][active!.row]);
      move(1, 0);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const next = draft === "" ? null : Number(draft);
      commit(Number.isFinite(next as number) && (next as number) >= 0 && (next as number) <= 24 ? next : pattern[active!.col][active!.row]);
      move(-1, 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = draft === "" ? null : Number(draft);
      commit(Number.isFinite(next as number) && (next as number) >= 0 && (next as number) <= 24 ? next : pattern[active!.col][active!.row]);
      move(0, -1);
    } else if (e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault();
      const next = draft === "" ? null : Number(draft);
      commit(Number.isFinite(next as number) && (next as number) >= 0 && (next as number) <= 24 ? next : pattern[active!.col][active!.row]);
      if (e.key === "Enter") setActive(null);
      else move(0, 1);
    } else if (e.key === "Escape") {
      setActive(null);
    } else if (e.key === "Backspace" && draft === "") {
      e.preventDefault();
      commit(null);
      move(-1, 0);
    }
  };

  const onBlur = () => {
    if (!active) return;
    if (draft === "") commit(null);
    else {
      const n = Number(draft);
      commit(Number.isFinite(n) && n >= 0 && n <= 24 ? n : pattern[active.col][active.row]);
    }
    setActive(null);
  };

  return (
    <div
      className="grid gap-0.5"
      style={{ gridTemplateColumns: `66px repeat(${cols}, minmax(0, 1fr))` }}
    >
      {STRING_ORDER.map((stringIdx, rowIdx) => (
        <RowCells
          key={stringIdx}
          label={STRING_LABELS[rowIdx]}
          stringIdx={stringIdx}
          pattern={pattern}
          active={active}
          highlightCol={highlightCol}
          draft={draft}
          inputRef={inputRef}
          onCellClick={(c) => startEdit(c, stringIdx)}
          onDraftChange={setDraft}
          onBlur={onBlur}
          onKey={onKey}
        />
      ))}
    </div>
  );
}

function RowCells({
  label, stringIdx, pattern, active, highlightCol, draft, inputRef,
  onCellClick, onDraftChange, onBlur, onKey,
}: {
  label: string;
  stringIdx: number;
  pattern: TabColumn[];
  active: { col: number; row: number } | null;
  highlightCol?: number;
  draft: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onCellClick: (col: number) => void;
  onDraftChange: (v: string) => void;
  onBlur: () => void;
  onKey: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-end pr-1 font-mono text-[11px] font-semibold text-stone-500">{label}</div>
      {pattern.map((col, ci) => {
        const v = col[stringIdx];
        const isEditing = active?.col === ci && active.row === stringIdx;
        const isCursorCol = highlightCol === ci;
        if (isEditing) {
          return (
            <input
              key={ci}
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={draft}
              onChange={(e) => onDraftChange(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
              onBlur={onBlur}
              onKeyDown={onKey}
              className="h-7 w-full rounded border border-orange-500 bg-white text-center font-mono text-xs text-stone-800 focus:outline-none"
            />
          );
        }
        return (
          <button
            key={ci}
            type="button"
            onClick={() => onCellClick(ci)}
            className={`h-7 rounded text-center font-mono text-xs transition ${
              v == null
                ? `${isCursorCol ? "bg-orange-100" : "bg-stone-100"} text-stone-300 hover:bg-stone-200`
                : `${isCursorCol ? "bg-orange-600" : "bg-orange-500"} text-white`
            }`}
          >
            {v == null ? "·" : v}
          </button>
        );
      })}
    </>
  );
}
