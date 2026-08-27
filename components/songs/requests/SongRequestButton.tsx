'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SongRequestModal } from './SongRequestModal';

export function SongRequestButton() {
  const t = useTranslations('Songs');
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        style={{
          padding: '10px 16px',
          borderRadius: 8,
          background: 'var(--ink-5)',
          color: 'var(--ink)',
          border: '1px solid var(--rule)',
          fontSize: 13,
          fontWeight: 500,
          fontFamily: 'var(--sans)',
          cursor: 'pointer',
        }}
      >
        {t('requestSongAction')}
      </button>
      <SongRequestModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
