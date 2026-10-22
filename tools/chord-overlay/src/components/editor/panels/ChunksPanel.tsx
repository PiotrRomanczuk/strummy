"use client";

import type { ChordChunk } from "@/lib/types";
import { Panel } from "../ui/Panel";

interface Props {
  chunks: ChordChunk[];
  cursor: number;       // markers.length — where the next Space tap will land
  onDistributeEvenly: () => void;
  duration: number;
  hasMarkers: boolean;
}

// Sanity check for the parser output. The chunk at index `cursor` is what the
// next Space tap will stamp; we render it as a "next up" highlight so the
// user sees what they're committing to before they tap.
export function ChunksPanel({
  chunks, cursor, onDistributeEvenly, duration, hasMarkers,
}: Props) {
  if (chunks.length === 0) {
    return (
      <Panel title="Parsed chunks" subtitle="from the chord sheet">
        <p className="text-xs text-stone-500">No chunks yet. Paste a chord sheet above.</p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Parsed chunks"
      subtitle={`${chunks.length} · cursor at #${Math.min(cursor + 1, chunks.length)}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onDistributeEvenly}
          disabled={duration <= 0 || chunks.length === 0}
          className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 transition hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-40"
          title={hasMarkers
            ? "Replace existing markers with evenly-spaced ones"
            : "Spread chunks evenly across the video duration"}
        >
          Distribute {chunks.length} chunks evenly
          {hasMarkers && <span className="ml-1 text-red-500">(replaces markers)</span>}
        </button>
      </div>
      <ol className="max-h-56 overflow-y-auto rounded-md border border-stone-200 bg-white text-xs">
        {chunks.map((c, i) => {
          const isCursor = i === cursor;
          const isPast = i < cursor;
          return (
            <li
              key={i}
              className={`flex items-center gap-2 border-b border-stone-100 px-3 py-1 last:border-b-0 ${
                isCursor ? "bg-orange-50" : ""
              }`}
            >
              <span className={`w-6 text-right font-mono ${
                isCursor ? "font-bold text-orange-600" : "text-stone-400"
              }`}>{i + 1}</span>
              <span className={`w-16 font-mono font-bold ${
                isPast ? "text-stone-400" : isCursor ? "text-orange-700" : "text-stone-800"
              }`}>{c.chord}</span>
              <span className="flex-1 truncate text-stone-600">
                {c.lyric || <em className="text-stone-300">no lyric</em>}
              </span>
              {isCursor && (
                <span className="rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  next
                </span>
              )}
              {isPast && (
                <span className="text-[10px] text-stone-400">marked</span>
              )}
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
