/**
 * One tempo, length and analysis date for a song, wherever it is shown (#1241). Pure.
 *
 * The rule:
 * - **Tempo.** With an analysed recording the recording is the source, at the pulse a player counts: song2logic's
 *   felt tempo when it heard a half-time feel, otherwise its beat. When that is about twice or half the teacher's
 *   tempo (within 8%), the analysis counted the wrong pulse, so the shown tempo is halved or doubled to the
 *   teacher's pulse — still the recording's own speed. Any other gap over 25% keeps the recording's value and asks
 *   staff to check it. Without a recording: the teacher's tempo.
 * - **Length.** With an analysed recording, the recording's length (it is what plays); otherwise the teacher's.
 * - **Date.** The day of the analysis the tempo, length and bars come from (`song_analyses`).
 *
 * The beat grid is not touched: bars are the recording's downbeats in seconds, and the backing track keeps
 * playing at the counted beat (`SongCard.bpm`), so the card stays in sync with the recording.
 */

/** How close to exactly 2× or ½× the teacher's tempo the recording must be to count as double/half time. */
export const HALF_DOUBLE_TOLERANCE = 0.08;
/** A larger gap than this between the recording and the teacher's tempo needs a look. */
export const CHECK_TOLERANCE = 0.25;

export interface SongTempo {
  /** The tempo to show and practise from. */
  bpm: number;
  source: 'recording' | 'song';
  /** The beat song2logic counted, when the shown tempo is not it (half time, double time); else null. */
  countedBpm: number | null;
  /** Shown tempo ÷ counted beat: 1, ½ or 2 (or the felt/counted ratio); 1 without a recording. */
  scale: number;
  /** The teacher's tempo when the recording disagrees with it by more than 25%: staff should check. */
  checkAgainst: number | null;
}

export interface RecordingTempoInput {
  /** The beat song2logic counted in the recording. */
  recordingBpm: number;
  /** song2logic's felt tempo when it heard a half-time feel, else null. */
  feltBpm: number | null;
  /** The teacher's tempo (`songs.tempo`). */
  songBpm: number | null;
}

const isPositive = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const near = (ratio: number, target: number, tolerance: number) =>
  Math.abs(ratio / target - 1) <= tolerance;

/** The correction (1, ½ or 2) that brings the recording's pulse to the teacher's, or null when none fits. */
function pulseFactor(pulse: number, songBpm: number): number | null {
  const ratio = pulse / songBpm;
  if (near(ratio, 1, CHECK_TOLERANCE)) return 1;
  if (near(ratio, 2, HALF_DOUBLE_TOLERANCE)) return 0.5;
  if (near(ratio, 0.5, HALF_DOUBLE_TOLERANCE)) return 2;
  return null;
}

/** The tempo of a song with an analysed recording. */
export function recordingTempo({ recordingBpm, feltBpm, songBpm }: RecordingTempoInput): SongTempo {
  const pulse = isPositive(feltBpm) ? feltBpm : recordingBpm;
  const factor = isPositive(songBpm) ? pulseFactor(pulse, songBpm) : 1;
  const bpm = pulse * (factor ?? 1);
  const scale = bpm / recordingBpm;
  return {
    bpm,
    source: 'recording',
    countedBpm: Math.round(bpm) === Math.round(recordingBpm) ? null : recordingBpm,
    scale,
    checkAgainst: factor === null ? songBpm : null,
  };
}

/** The tempo to show: from the recording when there is one, else the teacher's, else null. */
export function resolveSongTempo(input: {
  recordingBpm: number | null;
  feltBpm: number | null;
  songBpm: number | null;
}): SongTempo | null {
  if (isPositive(input.recordingBpm))
    return recordingTempo({ ...input, recordingBpm: input.recordingBpm });
  if (!isPositive(input.songBpm)) return null;
  return { bpm: input.songBpm, source: 'song', countedBpm: null, scale: 1, checkAgainst: null };
}

export interface RecordingFacts {
  bpm: number | null;
  feltBpm: number | null;
  durationSeconds: number | null;
  /** ISO date of the analysis. */
  analysedOn: string | null;
}

export interface SongTiming {
  tempo: SongTempo | null;
  durationSeconds: number | null;
  lengthSource: 'recording' | 'song' | null;
  /** ISO date (YYYY-MM-DD) of the analysis shown, or null without one. */
  analysedOn: string | null;
}

/** Tempo, length and analysis date of a song from its own row and its recording's analysis (if any). */
export function resolveSongTiming(
  song: { tempo: number | null; durationMs: number | null },
  recording: RecordingFacts | null
): SongTiming {
  const tempo = resolveSongTempo({
    recordingBpm: recording?.bpm ?? null,
    feltBpm: recording?.feltBpm ?? null,
    songBpm: song.tempo,
  });
  const recorded = recording?.durationSeconds;
  const own = isPositive(song.durationMs) ? song.durationMs / 1000 : null;
  const durationSeconds = isPositive(recorded) ? recorded : own;
  return {
    tempo,
    durationSeconds,
    lengthSource: isPositive(recorded) ? 'recording' : own === null ? null : 'song',
    analysedOn: recording?.analysedOn?.slice(0, 10) ?? null,
  };
}
