import Link from 'next/link';
import { AudioLines } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

type Props = { songId: string };

/**
 * Ghost "Song card" button of the song hero's action row: the card to play along with (SNG-17). Always shown to
 * staff — the card itself says when the recording has no analysis yet.
 */
export const SongHeroCardLink = async ({ songId }: Props) => {
  const t = await getTranslations('SongCard');
  return (
    <Link
      href={`/dashboard/songs/${songId}/card`}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--rule)] bg-[var(--card)] px-3 py-2 font-[family-name:var(--sans)] text-xs text-[var(--ink-2)] no-underline hover:bg-[var(--rule-2)]"
    >
      <AudioLines size={12} strokeWidth={1.6} aria-hidden="true" /> {t('heroLink')}
    </Link>
  );
};
