/** YouTube search for the song, opened in a new tab so the teacher can copy the right video's link. */
export const youtubeSearchUrl = (author: string | null, title: string): string =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent([author, title].filter(Boolean).join(' '))}`;

/** "3:58" from Spotify's duration, to tell the album track from a live version. */
export const formatDuration = (durationMs: number | null): string | null => {
  if (!durationMs || durationMs <= 0) return null;
  const totalSeconds = Math.round(durationMs / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
};
