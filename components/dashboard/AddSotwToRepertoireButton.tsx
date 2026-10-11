'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { addSotwToRepertoire } from '@/app/actions/song-of-the-week';
import { logger } from '@/lib/logger';

const buttonStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '9px 14px',
  borderRadius: 10,
  border: '1px solid var(--rule)',
  background: 'transparent',
  color: 'var(--ink-2)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
} as const;

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
        style={{ ...buttonStyle, color: 'var(--success)', borderColor: 'var(--success)' }}
      >
        {t('addedToRepertoire')}
      </button>
    );
  }

  return (
    <button onClick={handleAdd} disabled={isAdding} style={buttonStyle}>
      <Plus size={14} />
      {isAdding ? t('adding') : t('addToRepertoire')}
    </button>
  );
}
