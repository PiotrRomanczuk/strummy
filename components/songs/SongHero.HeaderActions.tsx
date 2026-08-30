'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { duplicateSongAction } from '@/app/actions/songs';

type Props = { songId: string };

const buttonStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 11,
  color: 'var(--ink-3)',
  background: 'none',
  textTransform: 'uppercase',
  letterSpacing: '.1em',
  padding: '6px 12px',
  border: '1px solid var(--rule)',
  borderRadius: 99,
  cursor: 'pointer',
};

/** Staff-only Duplicate + Assign-to-student actions shown next to the edit link. */
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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <button
        type="button"
        data-testid="duplicate-song-button"
        onClick={handleDuplicate}
        disabled={isDuplicating}
        style={buttonStyle}
      >
        {t('duplicateSong')}
      </button>
      {/* A plain in-page anchor jumps to the sidebar's quick-assign section —
          the browser handles the scroll, no imperative DOM access needed. */}
      <a href="#quick-assign" data-testid="assign-to-student-button" style={buttonStyle}>
        {t('assignToStudentButton')}
      </a>
    </div>
  );
};
