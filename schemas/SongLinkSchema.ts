import * as z from 'zod';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
]);

/** A link to one YouTube video: `watch?v=…`, `youtu.be/…` or `/shorts/…`; never a search or a channel. */
export const isYoutubeVideoUrl = (value: string): boolean => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || !YOUTUBE_HOSTS.has(url.hostname)) return false;
  if (url.hostname === 'youtu.be') return url.pathname.length > 1;
  if (url.pathname === '/watch') return Boolean(url.searchParams.get('v'));
  return /^\/(shorts|live)\/[\w-]+/.test(url.pathname);
};

/**
 * Categories for catalog entries that have no reference recording — an exercise, a strumming drill, a
 * tune the teacher writes out themselves. `songs.category` is free text, so these are ordinary values:
 * they show up as tabs on the songs list and take the entry out of the missing-links queue.
 */
export const NO_RECORDING_CATEGORIES = { exercise: 'Ćwiczenia', other: 'Inne' } as const;
export type NoRecordingKind = keyof typeof NO_RECORDING_CATEGORIES;

export const SongYoutubeLinkSchema = z.object({
  songId: z.string().uuid(),
  url: z.string().trim().max(300).refine(isYoutubeVideoUrl, { message: 'invalidYoutubeLink' }),
});

export const SongNoRecordingSchema = z.object({
  songId: z.string().uuid(),
  kind: z.enum(['exercise', 'other']),
});
