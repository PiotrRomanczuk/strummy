import { z } from 'zod';

/** A saved fretboard view: a name and the shareable-link query string it restores. */
export const FretboardPresetSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  // Exactly what `stateToSearch` emits: "?key=A&mode=scale&…" — nothing else.
  query: z
    .string()
    .max(300)
    .regex(/^\?[A-Za-z0-9_=&%.#-]+$/, 'Invalid fretboard state'),
});

export type FretboardPresetInput = z.infer<typeof FretboardPresetSchema>;
