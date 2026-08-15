'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { addSotwToRepertoire } from '@/app/actions/song-of-the-week';
import { logger } from '@/lib/logger';

export function AddSotwToRepertoireButton() {
  const t = useTranslations('Dashboard');
  const [isAdding, setIsAdding] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      const result = await addSotwToRepertoire();
      if ('success' in result) {
        setSuccess(true);
      }
    } catch (err) {
      logger.error('Failed to add SOTW to repertoire', err);
    } finally {
      setIsAdding(false);
    }
  };

  if (success) {
    return (
      <button 
        disabled
        className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 border border-green-200 py-2.5 px-6 rounded-lg font-medium"
      >
        {t('addedToRepertoire', { fallback: 'Added to Repertoire!' })}
      </button>
    );
  }

  return (
    <button 
      onClick={handleAdd}
      disabled={isAdding}
      className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 py-2.5 px-6 rounded-lg font-medium transition-colors"
    >
      <Plus className="w-4 h-4" />
      {isAdding ? t('adding', { fallback: 'Adding...' }) : t('addToRepertoire', { fallback: 'Add to Repertoire' })}
    </button>
  );
}
