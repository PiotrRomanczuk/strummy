"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { Project } from "@/lib/types";
import { saveProject } from "@/lib/actions";

export interface AutosaveState {
  pending: boolean;
  error: string | null;
  retry: () => void;
}

export function useProjectAutosave(project: Project, initial: Project): AutosaveState {
  const [pending, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const lastSavedRef = useRef<Project>(initial);
  const inFlightRef = useRef<Project | null>(null);

  const persist = useCallback((snapshot: Project) => {
    inFlightRef.current = snapshot;
    startSave(async () => {
      try {
        await saveProject(snapshot.slug, snapshot);
        lastSavedRef.current = snapshot;
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      } finally {
        inFlightRef.current = null;
      }
    });
  }, []);

  useEffect(() => {
    if (project === lastSavedRef.current) return;
    const handle = setTimeout(() => persist(project), 400);
    return () => clearTimeout(handle);
  }, [project, persist]);

  const retry = useCallback(() => {
    if (lastSavedRef.current !== project) persist(project);
  }, [persist, project]);

  return { pending, error, retry };
}
