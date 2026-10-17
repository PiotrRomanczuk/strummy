"use client";

import { useCallback, useState } from "react";
import type { TabColumn } from "@/lib/types";
import { asTab } from "@/lib/projectSchema";

const KEY = "jmg.tabClipboard";

function readInitial(): TabColumn[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return asTab(JSON.parse(raw)) ?? null;
  } catch {
    return null;
  }
}

// Persistent (localStorage) tab clipboard so users can copy a fingerstyle
// pattern from one marker to many without retyping all the cells.
export function useTabClipboard(): {
  clipboard: TabColumn[] | null;
  copy: (p: TabColumn[]) => void;
  clear: () => void;
} {
  const [clipboard, setClipboard] = useState<TabColumn[] | null>(readInitial);

  const copy = useCallback((p: TabColumn[]) => {
    setClipboard(p);
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* quota / private mode */ }
  }, []);

  const clear = useCallback(() => {
    setClipboard(null);
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }, []);

  return { clipboard, copy, clear };
}
