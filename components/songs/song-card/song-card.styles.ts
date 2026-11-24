import type { PartKind } from '@/lib/music-theory/song-map';

/** Class strings shared by the song card's sections (Strummy tokens from app/design-tokens.css). */

export const cardSection =
  'flex min-w-0 flex-col gap-3 rounded-[14px] border border-[var(--rule)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)] sm:p-5';

export const sectionTitle = 'font-serif text-2xl font-normal tracking-[-0.01em] text-[var(--ink)]';

export const eyebrow = 'font-mono text-[10.5px] uppercase tracking-[.14em] text-[var(--ink-4)]';

export const hint = 'text-[12.5px] leading-snug text-[var(--ink-3)]';

/** The top stripe of a part: one colour per kind, neutral for intro, outro and the rest. */
export const PART_STRIPE: Record<PartKind | 'other', string> = {
  intro: 'border-t-[var(--ink-4)]',
  verse: 'border-t-[var(--info)]',
  chorus: 'border-t-[var(--gold)]',
  bridge: 'border-t-[var(--success)]',
  solo: 'border-t-[var(--danger)]',
  inst: 'border-t-[var(--ink-4)]',
  break: 'border-t-[var(--ink-5)]',
  outro: 'border-t-[var(--ink-4)]',
  other: 'border-t-[var(--ink-4)]',
};
