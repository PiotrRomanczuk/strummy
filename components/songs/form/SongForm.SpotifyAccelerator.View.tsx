'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { SearchResult } from './SongForm.SpotifyAccelerator';
import { SpotifyMatchCard } from './SongForm.SpotifyAccelerator.Match';

const GREEN = 'var(--brand-spotify)';
const greenAlpha = (pct: number) => `color-mix(in oklab, ${GREEN} ${pct}%, transparent)`;

type Props = {
  query: string;
  matched: SearchResult | null;
  results: SearchResult[];
  isSearching: boolean;
  onQuery: (v: string) => void;
  onReset: () => void;
  onSelect: (r: SearchResult) => void;
};

/** Claude Design "Spotify accelerator" card: green wash, search row, matched result. */
export const SpotifyAcceleratorView = ({
  query,
  matched,
  results,
  isSearching,
  onQuery,
  onReset,
  onSelect,
}: Props) => {
  const t = useTranslations('Songs');
  return (
    <div
      className="ui-spotify-acc"
      style={{
        background: `linear-gradient(180deg, ${greenAlpha(10)} 0%, var(--card) 80%)`,
        border: `1px solid ${greenAlpha(25)}`,
        borderRadius: 14,
        padding: '16px 20px',
        marginBottom: 22,
      }}
    >
      <div
        className="ui-spotify-acc-head"
        style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: GREEN,
            boxShadow: `0 0 0 3px ${greenAlpha(13)}`,
          }}
        />
        <span
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '.14em',
            color: GREEN,
            fontWeight: 600,
          }}
        >
          {t('formSpotifyAcceleratorTitle')}
        </span>
        <span style={{ fontSize: 11, color: 'var(--ink-4)', fontStyle: 'italic' }}>
          {t('formSpotifyAcceleratorSub')}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <label
          className="ui-spotify-acc-field"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: 'var(--card)',
            border: '1px solid var(--rule)',
            borderRadius: 8,
          }}
        >
          <Search size={14} strokeWidth={1.6} color="var(--ink-4)" aria-hidden="true" />
          <input
            value={matched ? `${matched.name} — ${matched.artist}` : query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={t('formSpotifySearchPlaceholder')}
            aria-label={t('formSpotifySearchPlaceholder')}
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 14,
              color: 'var(--ink-2)',
              fontFamily: 'var(--sans)',
            }}
          />
          {matched && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: GREEN }}>
              ✓ {t('formSpotifyMatched')}
            </span>
          )}
          {isSearching && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
              {t('formSpotifySearchingLabel')}
            </span>
          )}
        </label>
        {matched && (
          <button
            type="button"
            onClick={onReset}
            style={{
              padding: '10px 16px',
              background: GREEN,
              color: 'var(--on-accent)',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {t('formSpotifySearchAgainButton')}
          </button>
        )}
      </div>
      {results.length > 0 && (
        <div
          style={{
            marginTop: 10,
            background: 'var(--card)',
            border: '1px solid var(--rule)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {results.slice(0, 6).map((r) => (
            <button
              type="button"
              key={r.id}
              onClick={() => onSelect(r)}
              className="ui-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                borderBottom: '1px solid var(--rule)',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'var(--sans)',
              }}
            >
              {r.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- tiny 3rd-party thumbnail in a search dropdown
                <img src={r.coverUrl} alt="" width={28} height={28} style={{ borderRadius: 4 }} />
              )}
              <span style={{ fontSize: 13 }}>{r.name}</span>
              <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>— {r.artist}</span>
            </button>
          ))}
        </div>
      )}
      {matched && <SpotifyMatchCard matched={matched} />}
    </div>
  );
};
