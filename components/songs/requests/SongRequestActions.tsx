'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
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

  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        className="text-red-600 border-red-200 hover:bg-red-50"
        disabled={isUpdating}
        onClick={() => handleAction('rejected')}
      >
        {t('reject', { fallback: 'Reject' })}
      </Button>
      <Button 
        className="bg-green-600 hover:bg-green-700 text-white"
        disabled={isUpdating}
        onClick={() => handleAction('approved')}
      >
        {t('approve', { fallback: 'Approve' })}
      </Button>
    </div>
  );
}
