'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';

import { songGhostButton } from './song-hero.styles';

import { duplicateSongAction } from '@/app/actions/songs';

type Props = { songId: string };

/** Staff-only Duplicate action of the song hero's action row. */
export const SongHeroHeaderActions = ({ songId }: Props) => {
  const t = useTranslations('Songs');
  const router = useRouter();
  const [isDuplicating, setIsDuplicating] = useState(false);

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    const result = await duplicateSongAction(songId);
    setIsDuplicating(false);

    if (!result.success || !result.id) {
      toast.error(result.error ?? t('duplicateSongError'));
      return;
    }

    toast.success(t('duplicateSongSuccess'));
    router.push(`/dashboard/songs/${result.id}`);
  };

  return (
    <>
      <button
        type="button"
        data-testid="duplicate-song-button"
        onClick={handleDuplicate}
        disabled={isDuplicating}
        style={songGhostButton}
      >
        <Copy size={12} strokeWidth={1.6} aria-hidden="true" /> {t('duplicateShort')}
      </button>
    </>
  );
};
