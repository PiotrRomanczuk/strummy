// Deterministic color per chord name. Used by Timeline pins and the chord
// voicing chip strip so the same chord wears the same color throughout the
// editor — no eye-jumping between two color systems for the same symbol.
export function chordColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `oklch(0.55 0.18 ${h % 360})`;
}
