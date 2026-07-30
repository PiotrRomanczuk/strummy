import * as z from 'zod';
import { VALIDATION_KEYS as V } from './shared/validation-keys';

// Profile edit schema - for user editing their own profile
export const ProfileEditSchema = z.object({
  firstname: z.string().min(1, V.firstNameRequired).max(100),
  lastname: z.string().min(1, V.lastNameRequired).max(100),
  username: z.string().min(3, V.usernameMinLength).max(50).optional(),
  bio: z.string().max(500, V.bioMaxLength).optional(),
  spotifyPlaylistUrl: z
    .string()
    .url(V.urlInvalid)
    .refine((url) => url.startsWith('https://open.spotify.com/'), {
      message: V.spotifyUrlInvalid,
    })
    .optional()
    .or(z.literal('')),
});

export type ProfileEdit = z.infer<typeof ProfileEditSchema>;
