import type { ChordChunk, ChordMarker, ChordVoicing, Project } from "@/lib/types";
import { voicingFor } from "@/lib/chordLibrary";

export interface OverlayFrame {
  current: { marker: ChordMarker; voicing: ChordVoicing; chord: string } | null;
  next: { marker: ChordMarker; voicing: ChordVoicing; chord: string } | null;
  lyricWindow: { idx: number; chord: string; lyric: string; active: boolean }[];
  progress: { barIdx: number; barCount: number };
  // 0..7 — sub-beat index. Driven by BPM when set, else by elapsed time
  // within the active chord segment so the strum animation still pulses.
  subBeat: number;
  // 0..1 — same time signal as subBeat but continuous, so variable-length
  // TAB rows (4/6/8/12/16 columns) can pick their own active column.
  subBeatFraction: number;
}

// Re-export for callers that historically imported this from here.
export { DEFAULT_STRUM_PATTERN as DEFAULT_STRUM } from "@/lib/types";

function resolve(project: Project, marker: ChordMarker | undefined) {
  if (!marker) return null;
  const voicing = project.voicings[marker.chord] ?? voicingFor(marker.chord);
  return { marker, voicing, chord: marker.chord };
}

// Sub-beat selection. With a BPM, we treat the strum pattern as one bar's worth
// of eighth-notes (8 sub-beats over 4 quarter-note beats → bpm/30 sub-beats per
// second). Without BPM, fall back to "stretch the 8 steps over the gap until
// the next chord change" so legacy projects keep their visible pulse.
function pickSubBeat(
  time: number, activeStart: number, activeEnd: number, bpm: number | undefined,
): { index: number; fraction: number } {
  if (bpm && bpm > 0) {
    const elapsed = Math.max(0, time - activeStart);
    const cont = elapsed * (bpm / 30);
    return { index: Math.floor(cont) % 8, fraction: cont % 1 };
  }
  const span = Math.max(0.001, activeEnd - activeStart);
  const cont = Math.max(0, Math.min(7.999, ((time - activeStart) / span) * 8));
  return { index: Math.floor(cont), fraction: cont % 1 };
}

export function frameAt(project: Project, time: number, sortedMarkers?: ChordMarker[]): OverlayFrame {
  const sorted = sortedMarkers ?? [...project.markers].sort((a, b) => a.time - b.time);
  let activeIdx = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].time <= time) activeIdx = i;
    else break;
  }

  const current = activeIdx >= 0 ? resolve(project, sorted[activeIdx]) : null;
  const next = resolve(project, sorted[activeIdx + 1]);

  const window: OverlayFrame["lyricWindow"] = [];
  for (let offset = -1; offset <= 2; offset++) {
    const i = activeIdx + offset;
    if (i < 0 || i >= sorted.length) continue;
    const m = sorted[i];
    window.push({
      idx: i,
      chord: m.chord,
      lyric: m.lyric ?? "",
      active: i === activeIdx,
    });
  }

  let subBeat = 0;
  let subBeatFraction = 0;
  if (activeIdx >= 0) {
    const start = sorted[activeIdx].time;
    const end = sorted[activeIdx + 1]?.time ?? start + 2;
    const sb = pickSubBeat(time, start, end, project.bpmDisplay);
    subBeat = sb.index;
    subBeatFraction = (sb.index + sb.fraction) / 8;
  }

  return {
    current,
    next,
    lyricWindow: window,
    progress: { barIdx: Math.max(0, activeIdx), barCount: project.markers.length },
    subBeat,
    subBeatFraction,
  };
}

// Editor helper: stamp a new marker at `time`. Suggests chord/lyric from the
// next un-marked chunk in the sheet (cursor = current marker count). Falls
// back to repeating the last marker's chord when the sheet is exhausted, and
// to a placeholder when there's nothing at all.
export function appendMarker(
  markers: ChordMarker[],
  chunks: ChordChunk[],
  time: number,
  newId: string,
): ChordMarker[] {
  const cursor = markers.length;
  const suggested = chunks[cursor];
  const lastChord = markers[markers.length - 1]?.chord;
  const chord = suggested?.chord ?? lastChord ?? "?";
  const lyric = suggested?.lyric || undefined;
  const marker: ChordMarker = { id: newId, time, chord };
  if (lyric) marker.lyric = lyric;
  return [...markers, marker];
}

export interface RetimeResult {
  markers: ChordMarker[];
  applied: boolean;
  delta: number;        // distance to nearest marker (s)
  tolerance: number;    // tolerance window used (s)
}

// Re-time an existing marker (Shift+Space): move the closest marker (within
// `tolerance` seconds) to `time`. Returns the unchanged array and applied=false
// when nothing is in range, so the caller can surface "no marker close enough"
// feedback instead of failing silently.
export function retimeNearestMarker(
  markers: ChordMarker[],
  time: number,
  tolerance = 1.5,
): RetimeResult {
  if (markers.length === 0) {
    return { markers, applied: false, delta: Infinity, tolerance };
  }
  let nearest = markers[0];
  let minDelta = Math.abs(nearest.time - time);
  for (const m of markers) {
    const d = Math.abs(m.time - time);
    if (d < minDelta) { nearest = m; minDelta = d; }
  }
  if (minDelta > tolerance) {
    return { markers, applied: false, delta: minDelta, tolerance };
  }
  return {
    markers: markers.map((m) => (m.id === nearest.id ? { ...m, time } : m)),
    applied: true,
    delta: minDelta,
    tolerance,
  };
}

// Tolerance window for Shift+Space. With BPM, half a beat is the natural
// "I'm trying to retime this marker, not insert a new one" boundary. Without
// BPM, fall back to the old 1.5 s magic number.
export function retimeTolerance(bpm: number | undefined): number {
  if (bpm && bpm > 0) return 30 / bpm;
  return 1.5;
}

// Shift every marker's time by `deltaSec`. Used by the tap-lag suggestion
// "Apply nudge" button. Clamps results to non-negative time.
export function nudgeAllMarkers(markers: ChordMarker[], deltaSec: number): ChordMarker[] {
  return markers.map((m) => ({ ...m, time: Math.max(0, m.time + deltaSec) }));
}

// Shift only markers whose time is >= `fromSec` by `deltaSec`. Used to fix
// "the back half is consistently late" without touching the intro.
export function nudgeMarkersAfter(
  markers: ChordMarker[], fromSec: number, deltaSec: number,
): ChordMarker[] {
  return markers.map((m) => (m.time >= fromSec ? { ...m, time: Math.max(0, m.time + deltaSec) } : m));
}

// Find marker neighbors in time order, used by [/] seeking and Backspace.
export function neighborMarkers(markers: ChordMarker[], time: number) {
  const sorted = [...markers].sort((a, b) => a.time - b.time);
  let prev: ChordMarker | undefined;
  let next: ChordMarker | undefined;
  for (const m of sorted) {
    if (m.time < time - 0.05) prev = m;
    else if (m.time > time + 0.05) { next = m; break; }
  }
  // Closest in absolute time, used for Backspace ("delete the one I'm on").
  let closest: ChordMarker | undefined;
  let minD = Infinity;
  for (const m of sorted) {
    const d = Math.abs(m.time - time);
    if (d < minD) { minD = d; closest = m; }
  }
  return { prev, next, closest };
}
