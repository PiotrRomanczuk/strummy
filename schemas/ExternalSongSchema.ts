import type * as z from 'zod';

import { SongInputSchema } from './SongSchema';

/**
 * Body of `POST /api/external/songs`: the song fields an external client may
 * set, validated like the in-app song form (enums for level and key, URLs).
 */
export const ExternalSongCreateSchema = SongInputSchema.pick({
  title: true,
  author: true,
  level: true,
  key: true,
  ultimate_guitar_link: true,
  chords: true,
  short_title: true,
  youtube_url: true,
  gallery_images: true,
});

export type ExternalSongCreate = z.infer<typeof ExternalSongCreateSchema>;
