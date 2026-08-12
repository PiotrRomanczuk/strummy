'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

type Tab = 'chords' | 'lyrics';

type Props = {
  chords: ReactNode;
  lyrics: ReactNode;
};

const tabButtonStyle = (active: boolean) => ({
  appearance: 'none' as const,
  background: 'transparent',
  border: 'none',
  borderBottom: `2px solid ${active ? 'var(--ink)' : 'transparent'}`,
  padding: '10px 4px',
  marginRight: 24,
  cursor: 'pointer',
  fontFamily: 'var(--mono)',
  fontSize: 11,
  textTransform: 'uppercase' as const,
  letterSpacing: '.14em',
  color: active ? 'var(--ink)' : 'var(--ink-4)',
});

/**
 * Switches the main song-detail column between "Chords & structure" and
 * "Lyrics", matching the mockup. Independent of the staff-only
 * Overview/Production split in `SongDetailTabs` — this switcher is visible
 * to every viewer, so the two axes stay decoupled rather than merged into
 * one tab strip.
 */
export const SongDetailContentTabs = ({ chords, lyrics }: Props) => {
  const t = useTranslations('Songs');
  const [tab, setTab] = useState<Tab>('chords');

  return (
    <div style={{ minWidth: 0 }}>
      <div
        role="tablist"
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--rule)',
          marginBottom: 20,
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'chords'}
          onClick={() => setTab('chords')}
          style={tabButtonStyle(tab === 'chords')}
        >
          {t('tabChordsStructure')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'lyrics'}
          onClick={() => setTab('lyrics')}
          style={tabButtonStyle(tab === 'lyrics')}
        >
          {t('tabLyrics')}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {tab === 'chords' ? chords : lyrics}
      </div>
    </div>
  );
};
