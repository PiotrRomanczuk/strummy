'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { reviewSongRequest } from '@/app/actions/song-requests';
import { logger } from '@/lib/logger';

export function SongRequestActions({ requestId }: { requestId: string }) {
  const t = useTranslations('Songs');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAction = async (status: 'approved' | 'rejected') => {
    setIsUpdating(true);
    try {
      await reviewSongRequest(requestId, { status, reviewNotes: '' });
    } catch (err) {
      logger.error('Failed to review song request', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Ink primary + plain secondary, like every other decision in the app; the
  // green/red pair belonged to a different design system.
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={isUpdating}
        onClick={() => handleAction('rejected')}
        className="h-10 rounded-[10px] border border-[var(--rule)] bg-[var(--card)] px-4 text-sm text-[var(--danger)] disabled:opacity-60"
      >
        {t('reject')}
      </button>
      <button
        type="button"
        disabled={isUpdating}
        onClick={() => handleAction('approved')}
        className="h-10 rounded-[10px] bg-[var(--ink)] px-4 text-sm font-medium text-[var(--paper)] disabled:opacity-60"
      >
        {t('approve')}
      </button>
    </div>
  );
}
