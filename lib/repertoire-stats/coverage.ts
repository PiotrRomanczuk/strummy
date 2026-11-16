import type { RepertoireSong } from './repertoire-song';

export type MissingData = 'link' | 'analysis' | 'transcription';

export interface Coverage {
  total: number;
  withLink: number;
  withAnalysis: number;
  withTranscription: number;
  /** Songs missing anything, most missing first. */
  missing: { song: RepertoireSong; lacks: MissingData[] }[];
}

/**
 * What the repertoire has from its recordings. The order is the pipeline's: a song needs a recording link
 * before song2logic can analyse it, and a recording before `study` can transcribe it.
 */
export function coverageOf(songs: RepertoireSong[]): Coverage {
  const missing = songs
    .map((song) => {
      const lacks: MissingData[] = [];
      if (!song.hasLink) lacks.push('link');
      if (!song.measured) lacks.push('analysis');
      if (!song.transcription) lacks.push('transcription');
      return { song, lacks };
    })
    .filter(({ lacks }) => lacks.length > 0)
    .sort((a, b) => b.lacks.length - a.lacks.length || a.song.title.localeCompare(b.song.title));
  return {
    total: songs.length,
    withLink: songs.filter((song) => song.hasLink).length,
    withAnalysis: songs.filter((song) => song.measured).length,
    withTranscription: songs.filter((song) => song.transcription).length,
    missing,
  };
}
