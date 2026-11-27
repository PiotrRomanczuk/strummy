/**
 * What a student can play of a song, from the append-only marks in `student_song_progress` (#1136).
 * The song's status is never stored: the latest mark per part decides it.
 */

export type SongProgressStatus = 'not_started' | 'started' | 'mastered';

/** One stored mark; `partLabel` null = the whole song. */
export interface SongProgressMark {
  partLabel: string | null;
  tempoPercent: number;
  markedAt: string;
}

export interface SongPartTempo {
  label: string;
  tempoPercent: number;
  markedAt: string;
}

export interface SongProgress {
  status: SongProgressStatus;
  parts: SongPartTempo[];
}

/** Tempo (percent of the original) at which a part counts as played. */
export const MASTERED_TEMPO_PERCENT = 100;

/** The newest mark wins; ISO timestamps compare as strings only when equally formatted, so compare as dates. */
function isNewer(a: SongProgressMark, b: SongProgressMark): boolean {
  return new Date(a.markedAt).getTime() > new Date(b.markedAt).getTime();
}

/** The newest mark per part label (null = the whole song). */
export function latestByLabel(marks: SongProgressMark[]): Map<string | null, SongProgressMark> {
  const latest = new Map<string | null, SongProgressMark>();
  for (const mark of marks) {
    const current = latest.get(mark.partLabel);
    if (!current || isNewer(mark, current)) latest.set(mark.partLabel, mark);
  }
  return latest;
}

/**
 * @param partLabels distinct form letters of the song (`song_segments.parts[].label`); empty when the song has
 *   no segments. Repeats of a part share their label, so each label is one part.
 * @param marks every stored mark of the student for this song, in any order.
 */
export function deriveSongProgress(partLabels: string[], marks: SongProgressMark[]): SongProgress {
  if (marks.length === 0) return { status: 'not_started', parts: [] };

  const latest = latestByLabel(marks);
  const labels = [...new Set(partLabels)];

  if (labels.length === 0) {
    const whole = latest.get(null);
    return {
      status: whole && whole.tempoPercent >= MASTERED_TEMPO_PERCENT ? 'mastered' : 'started',
      parts: [],
    };
  }

  const parts: SongPartTempo[] = [];
  for (const label of labels) {
    const mark = latest.get(label);
    if (mark) parts.push({ label, tempoPercent: mark.tempoPercent, markedAt: mark.markedAt });
  }
  const isMastered =
    parts.length === labels.length && parts.every((p) => p.tempoPercent >= MASTERED_TEMPO_PERCENT);
  return { status: isMastered ? 'mastered' : 'started', parts };
}
