import { AVATAR_COLORS } from '@/schemas/StudentIntakeSchema';

/**
 * The Claude Design avatars give every student their own colour so a person is
 * recognisable across lists. Use the colour picked on the student form when
 * there is one; otherwise derive a stable one from the name, so the same
 * person always lands on the same swatch.
 */
export function avatarColorFor(seed: string | null | undefined, stored?: string | null): string {
  if (stored && /^#[0-9a-f]{6}$/i.test(stored)) return stored;
  const source = (seed ?? '').trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < source.length; i++) hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
