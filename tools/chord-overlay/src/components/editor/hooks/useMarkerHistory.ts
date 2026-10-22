"use client";

import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { ChordMarker, Project } from "@/lib/types";

const MAX_HISTORY = 50;

// Undo/redo stack scoped to the markers array. We don't snapshot the whole
// project (voicings, tab edits) because those have their own commit cadence
// and the user pain-point is "I taped a bad pin, give me Cmd+Z."
export function useMarkerHistory(
  markers: ChordMarker[],
  setProject: Dispatch<SetStateAction<Project>>,
) {
  const undo = useRef<ChordMarker[][]>([]);
  const redo = useRef<ChordMarker[][]>([]);
  const last = useRef<ChordMarker[]>(markers);
  const skipRecord = useRef(false);

  // Record only "meaningful" deltas: when the marker count changes or any
  // marker swaps id/chord/time. Tab/lyric edits ride along with the same
  // shallow check via JSON of the trimmed shape.
  useEffect(() => {
    if (skipRecord.current) { skipRecord.current = false; last.current = markers; return; }
    if (last.current === markers) return;
    if (JSON.stringify(last.current) === JSON.stringify(markers)) {
      last.current = markers; return;
    }
    undo.current.push(last.current);
    if (undo.current.length > MAX_HISTORY) undo.current.shift();
    redo.current = [];
    last.current = markers;
  }, [markers]);

  const apply = useCallback((next: ChordMarker[]) => {
    skipRecord.current = true;
    setProject((p) => ({ ...p, markers: next }));
  }, [setProject]);

  const performUndo = useCallback(() => {
    const prev = undo.current.pop();
    if (!prev) return false;
    redo.current.push(last.current);
    apply(prev);
    return true;
  }, [apply]);

  const performRedo = useCallback(() => {
    const next = redo.current.pop();
    if (!next) return false;
    undo.current.push(last.current);
    apply(next);
    return true;
  }, [apply]);

  return { performUndo, performRedo };
}
