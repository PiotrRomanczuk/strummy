"use client";

import { useEffect } from "react";
import type { ChordMarker } from "@/lib/types";
import { neighborMarkers } from "@/components/overlay/overlayState";

interface Args {
  markers: ChordMarker[];
  getTime: () => number;
  insertAtPlayhead: () => void;
  retimeNearestToPlayhead: () => void;
  deleteNearestToPlayhead: () => void;
  seekTo: (t: number) => void;
  togglePlay: () => void;
  undo: () => boolean;
  redo: () => boolean;
  toggleHelp: () => void;
}

function isInputTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
}

// Keyboard ergonomics:
//   Space            insert marker at playhead
//   Shift+Space      re-time nearest marker to playhead
//   K                play/pause
//   J / L            seek -3s / +3s
//   [ / ]            previous / next marker
//   ⌫ / Del          delete nearest marker
//   Cmd/Ctrl+Z       undo last marker change
//   Cmd/Ctrl+Shift+Z, Cmd/Ctrl+Y   redo
//   ?                toggle keyboard help overlay
export function useMarkerKeys({
  markers, getTime, insertAtPlayhead, retimeNearestToPlayhead, deleteNearestToPlayhead,
  seekTo, togglePlay, undo, redo, toggleHelp,
}: Args): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isInputTarget(e.target)) return;
      const meta = e.metaKey || e.ctrlKey;

      if (meta && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if (meta && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        redo();
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (e.shiftKey) retimeNearestToPlayhead();
        else insertAtPlayhead();
        return;
      }
      if (e.key === "k" || e.key === "K") { e.preventDefault(); togglePlay(); return; }
      if (e.key === "j" || e.key === "J") { e.preventDefault(); seekTo(Math.max(0, getTime() - 3)); return; }
      if (e.key === "l" || e.key === "L") { e.preventDefault(); seekTo(getTime() + 3); return; }
      if (e.key === "[") {
        e.preventDefault();
        const { prev } = neighborMarkers(markers, getTime());
        if (prev) seekTo(prev.time);
        return;
      }
      if (e.key === "]") {
        e.preventDefault();
        const { next } = neighborMarkers(markers, getTime());
        if (next) seekTo(next.time);
        return;
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        deleteNearestToPlayhead();
        return;
      }
      if (e.key === "?") { e.preventDefault(); toggleHelp(); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    markers, getTime, insertAtPlayhead, retimeNearestToPlayhead, deleteNearestToPlayhead,
    seekTo, togglePlay, undo, redo, toggleHelp,
  ]);
}
