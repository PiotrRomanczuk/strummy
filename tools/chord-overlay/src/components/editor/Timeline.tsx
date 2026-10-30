"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { ChordChunk, ChordMarker, ChordVoicing, TabColumn } from "@/lib/types";
import { chordColor } from "@/lib/chordColor";
import { MarkerListItem } from "./MarkerListItem";

interface Props {
  markers: ChordMarker[];          // expected pre-sorted by time
  chunks: ChordChunk[];            // sheet — used as a suggestion source only
  knownChords: string[];           // chord vocabulary (from markers + sheet)
  voicings: Record<string, ChordVoicing>;
  duration: number;
  currentTime: number;
  onChange: (markers: ChordMarker[]) => void;
  onSeek: (time: number) => void;
  onInsertAtPlayhead: () => void;
  // Externally-controlled inline TAB editor target. When set, the matching
  // marker shows its TabPatternEditor open. Lets sibling panels (TabPanel)
  // jump straight to a marker's tab without scrolling the marker list.
  tabEditing?: string | null;
  onTabEditingChange?: (id: string | null) => void;
}

// Drag-clamp: a marker can't overtake its neighbors. Reserves a small epsilon
// so identical times are impossible (stable time-sort).
function clampTime(markers: ChordMarker[], id: string, t: number, duration: number): number {
  const sorted = [...markers].sort((a, b) => a.time - b.time);
  const idx = sorted.findIndex((m) => m.id === id);
  const eps = 0.01;
  const lo = idx > 0 ? sorted[idx - 1].time + eps : 0;
  const hi = idx < sorted.length - 1 ? sorted[idx + 1].time - eps : duration;
  return Math.min(hi, Math.max(lo, t));
}

export function Timeline({
  markers, chunks, knownChords, voicings, duration, currentTime, onChange, onSeek, onInsertAtPlayhead,
  tabEditing: tabEditingProp, onTabEditingChange,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [tabEditingLocal, setTabEditingLocal] = useState<string | null>(null);
  const tabEditing = tabEditingProp ?? tabEditingLocal;
  const setTabEditing = useCallback((id: string | null) => {
    if (onTabEditingChange) onTabEditingChange(id);
    else setTabEditingLocal(id);
  }, [onTabEditingChange]);

  const xToTime = useCallback((x: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (x - rect.left) / rect.width)) * duration;
  }, [duration]);

  const startDrag = useCallback((id: string, ev: React.PointerEvent) => {
    ev.stopPropagation(); ev.preventDefault();
    // Pause during the drag so timeupdate doesn't fight the pointer.
    const video = (ev.currentTarget.closest("section")?.querySelector("video") as HTMLVideoElement | null) ?? null;
    const wasPlaying = video ? !video.paused : false;
    if (video && wasPlaying) video.pause();
    const move = (e: PointerEvent) => {
      const t = clampTime(markers, id, xToTime(e.clientX), duration);
      onChange(markers.map((m) => (m.id === id ? { ...m, time: t } : m)));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (video && wasPlaying) video.play();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }, [markers, onChange, duration, xToTime]);

  const removeMarker = useCallback((id: string) => {
    onChange(markers.filter((m) => m.id !== id));
  }, [markers, onChange]);
  const setChord = useCallback((id: string, chord: string) => {
    onChange(markers.map((m) => (m.id === id ? { ...m, chord } : m)));
  }, [markers, onChange]);
  const setLyric = useCallback((id: string, lyric: string) => {
    onChange(markers.map((m) => {
      if (m.id !== id) return m;
      const next = { ...m };
      if (lyric) next.lyric = lyric; else delete next.lyric;
      return next;
    }));
  }, [markers, onChange]);
  const setTab = useCallback((id: string, tab: TabColumn[] | undefined) => {
    onChange(markers.map((m) => {
      if (m.id !== id) return m;
      const next = { ...m };
      if (tab) next.tab = tab; else delete next.tab;
      return next;
    }));
  }, [markers, onChange]);

  const upcomingChords = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 3; i++) {
      const c = chunks[markers.length + i];
      if (c) out.push(c.chord);
    }
    if (out.length === 0 && markers.length > 0) out.push(markers[markers.length - 1].chord);
    if (out.length === 0) out.push("?");
    return out;
  }, [markers, chunks]);

  const onStartEdit = useCallback((id: string) => {
    setEditing((cur) => (cur === id ? null : id));
    setTabEditing(null);
  }, [setTabEditing]);
  const onStartTab = useCallback((id: string) => {
    setTabEditing(tabEditing === id ? null : id);
    setEditing(null);
  }, [tabEditing, setTabEditing]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onInsertAtPlayhead}
          className="rounded-md border border-orange-400 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100"
        >
          + Mark <span className="font-mono">{upcomingChords[0]}</span> at {currentTime.toFixed(2)}s
        </button>
        {upcomingChords.length > 1 && (
          <div className="flex items-center gap-1 text-xs text-stone-500">
            <span className="text-[10px] uppercase tracking-wider">then</span>
            {upcomingChords.slice(1).map((c, i) => (
              <span
                key={i}
                className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-stone-600"
              >{c}</span>
            ))}
          </div>
        )}
        <span className="text-xs text-stone-500">
          <kbd className="rounded bg-stone-200 px-1 text-stone-700">?</kbd> for keys
        </span>
      </div>

      <div
        ref={trackRef}
        onClick={(e) => onSeek(xToTime(e.clientX))}
        className="relative h-16 cursor-pointer rounded-md border border-stone-200 bg-stone-100"
      >
        {duration > 0 && Array.from({ length: Math.ceil(duration) }, (_, i) => (
          <div key={i}
            className="absolute top-0 bottom-0 w-px bg-stone-200"
            style={{ left: `${(i / duration) * 100}%` }}
          />
        ))}
        <div
          className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-orange-500 shadow-[0_0_4px_rgba(249,115,22,0.7)]"
          style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
        />
        {markers.map((m) => (
          <div
            key={m.id}
            onPointerDown={(e) => startDrag(m.id, e)}
            onDoubleClick={(e) => { e.stopPropagation(); onStartTab(m.id); }}
            onContextMenu={(e) => { e.preventDefault(); removeMarker(m.id); }}
            className="absolute top-1 flex h-14 w-14 -translate-x-1/2 cursor-ew-resize flex-col items-center justify-center rounded border-2 text-xs font-bold text-white shadow"
            style={{
              left: `${duration ? (m.time / duration) * 100 : 0}%`,
              borderColor: chordColor(m.chord), background: chordColor(m.chord),
            }}
            title={`${m.chord} @ ${m.time.toFixed(2)}s — drag to nudge, double-click for TAB, right-click to delete`}
          >
            <span className="font-mono">{m.chord}</span>
            <span className="font-mono text-[9px] opacity-80">{m.time.toFixed(2)}</span>
            {m.tab && (
              <span
                className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 px-1 text-[8px] font-mono text-white shadow ring-1 ring-white"
                title="Has TAB"
              >T</span>
            )}
          </div>
        ))}
      </div>

      {markers.length === 0 ? (
        <p className="text-xs text-stone-500">
          {chunks.length > 0
            ? "Press Space at each chord change in the video."
            : "Paste a chord sheet, then press Space at each chord change."}
        </p>
      ) : (
        <ul className="max-h-72 overflow-y-auto rounded-md border border-stone-200 bg-white text-xs">
          {markers.map((m, i) => (
            <MarkerListItem
              key={m.id}
              index={i}
              marker={m}
              voicing={voicings[m.chord]}
              knownChords={knownChords}
              isEditing={editing === m.id}
              isTabEditing={tabEditing === m.id}
              chordColor={chordColor}
              onSeek={onSeek}
              onRemove={removeMarker}
              onStartEdit={onStartEdit}
              onStartTab={onStartTab}
              onCloseEdit={() => setEditing(null)}
              onChord={setChord}
              onLyric={setLyric}
              onTab={setTab}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
