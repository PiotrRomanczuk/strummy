"use client";

import { useCallback, type Dispatch, type RefObject, type SetStateAction } from "react";
import { nanoid } from "nanoid";
import type { Project } from "@/lib/types";
import {
  appendMarker, neighborMarkers, retimeNearestMarker, retimeTolerance,
} from "@/components/overlay/overlayState";

export interface RetimeFeedback {
  applied: boolean;
  delta: number;
  tolerance: number;
}

export function useMarkerActions(
  videoRef: RefObject<HTMLVideoElement | null>,
  setProject: Dispatch<SetStateAction<Project>>,
  onRetime?: (f: RetimeFeedback) => void,
) {
  const insertAtPlayhead = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setProject((p) => ({
      ...p,
      markers: appendMarker(p.markers, p.chunks, v.currentTime, nanoid(8)),
    }));
  }, [videoRef, setProject]);

  const retimeNearestToPlayhead = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setProject((p) => {
      const tol = retimeTolerance(p.bpmDisplay);
      const r = retimeNearestMarker(p.markers, v.currentTime, tol);
      onRetime?.({ applied: r.applied, delta: r.delta, tolerance: r.tolerance });
      return r.applied ? { ...p, markers: r.markers } : p;
    });
  }, [videoRef, setProject, onRetime]);

  const deleteNearestToPlayhead = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setProject((p) => {
      const { closest } = neighborMarkers(p.markers, v.currentTime);
      if (!closest) return p;
      return { ...p, markers: p.markers.filter((m) => m.id !== closest.id) };
    });
  }, [videoRef, setProject]);

  return { insertAtPlayhead, retimeNearestToPlayhead, deleteNearestToPlayhead };
}
