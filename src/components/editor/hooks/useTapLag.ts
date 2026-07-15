"use client";

import { useCallback, useRef, useState } from "react";

const SAMPLE_SIZE = 5;

// Estimate the user's tap-lag: if their last N taps consistently land just
// after a beat boundary (hypothesized via BPM or even spacing), suggest a
// fixed offset to nudge all markers by. This is intentionally lightweight —
// we just collect tap-time deltas relative to the previous tap and surface
// the median when it's stable.
//
// Heuristic: if the last 5 inserts have a stable inter-tap delta, the user is
// probably keeping the beat. We don't try to detect lag itself (would need
// audio onset detection) — instead we expose `recentLagMs` based on the
// difference between each tap's time and the *closest* round 0.05s grid mark
// when no BPM is set, or the closest beat when one is. This is a heuristic
// nudge ("looks like you're consistently 80 ms late — Shift+Space to retime
// or click 'Apply nudge'").
export function useTapLag(bpm: number | undefined): {
  recordTap: (t: number) => void;
  suggestion: { offsetMs: number; confidence: number } | null;
  clear: () => void;
} {
  const taps = useRef<number[]>([]);
  const [suggestion, setSuggestion] = useState<{ offsetMs: number; confidence: number } | null>(null);

  const recordTap = useCallback((t: number) => {
    taps.current.push(t);
    if (taps.current.length > SAMPLE_SIZE) taps.current.shift();

    if (taps.current.length < 3) { setSuggestion(null); return; }

    const beat = bpm && bpm > 0 ? 60 / bpm : 0.5;
    // Distance from each tap to the nearest beat grid line. Negative = early.
    const lags = taps.current.map((tap) => {
      const k = Math.round(tap / beat);
      return tap - k * beat;
    });
    // If the lags are tightly clustered (low stdev), the user is consistent.
    const mean = lags.reduce((a, b) => a + b, 0) / lags.length;
    const variance = lags.reduce((a, b) => a + (b - mean) ** 2, 0) / lags.length;
    const stdev = Math.sqrt(variance);

    // Only surface if the offset is meaningful (>40 ms) and consistent
    // (stdev within 50 ms = "really keeping the beat").
    const offsetMs = Math.round(mean * 1000);
    if (Math.abs(offsetMs) >= 40 && stdev <= 0.05) {
      const confidence = Math.max(0, Math.min(1, 1 - stdev / 0.05));
      setSuggestion({ offsetMs, confidence });
    } else {
      setSuggestion(null);
    }
  }, [bpm]);

  const clear = useCallback(() => {
    taps.current = [];
    setSuggestion(null);
  }, []);

  return { recordTap, suggestion, clear };
}
