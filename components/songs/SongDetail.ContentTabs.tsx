'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

type Tab = 'chords' | 'lyrics' | 'tabs' | 'production';

type Props = {
  chords: ReactNode;
  lyrics: ReactNode;
  /** Tablature; omitted when the song has none, so no empty tab shows. */
  tabs?: ReactNode;
  /** Staff-only content-production tab; omitted for students. */
  production?: ReactNode;
};

const tabButtonStyle = (active: boolean) => ({
  appearance: 'none' as const,
  background: 'transparent',
  border: 'none',
  padding: '10px 18px',
  cursor: 'pointer',
  fontFamily: 'var(--sans)',
  fontSize: 13,
  color: active ? 'var(--ink)' : 'var(--ink-4)',
  fontWeight: active ? 500 : 400,
  borderBottom: `2px solid ${active ? 'var(--gold-2)' : 'transparent'}`,
  marginBottom: -1,
});

/**
 * Claude Design inline tabs for the song's main column. Production (staff
 * only) is one more tab here rather than a second strip above the page.
 */
export const SongDetailContentTabs = ({ chords, lyrics, tabs: tablature, production }: Props) => {
  const t = useTranslations('Songs');
  const [tab, setTab] = useState<Tab>('chords');
  const tabs: [Tab, string][] = [
    ['chords', t('tabChordsStructure')],
    ['lyrics', t('tabLyrics')],
    ...(tablature ? ([['tabs', t('tabTabs')]] as [Tab, string][]) : []),
    ...(production ? ([['production', t('tabProductionShort')]] as [Tab, string][]) : []),
  ];
  const bodies: Record<Tab, ReactNode> = { chords, lyrics, tabs: tablature, production };
  const body = bodies[tab];

  return (
    <div style={{ minWidth: 0 }}>
      <div
        role="tablist"
        style={{ display: 'flex', borderBottom: '1px solid var(--rule)', marginBottom: 20 }}
      >
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            style={tabButtonStyle(tab === key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>{body}</div>
    </div>
  );
};
