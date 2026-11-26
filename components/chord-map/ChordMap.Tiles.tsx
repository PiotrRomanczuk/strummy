'use client';

import { useTranslations } from 'next-intl';

import type { ChordShape } from '@/lib/music-theory/chord-shape';
import type { ChordTile } from '@/lib/services/chord-map';

type Props = { tiles: ChordTile[]; onToggle: (shape: ChordShape) => void };

const TILE =
  'flex flex-col items-start gap-0.5 rounded-[10px] border px-2.5 pb-2 pt-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]';
const KNOWN = 'border-[var(--gold)] bg-[var(--gold-tint)] text-[var(--ink)]';
const UNKNOWN =
  'border-[var(--rule)] bg-[var(--card)] text-[var(--ink-3)] hover:border-[var(--ink-4)]';

/** Every shape of the catalogue; a tile toggles "I know this one". */
export function ChordMapTiles({ tiles, onToggle }: Props) {
  const t = useTranslations('ChordMap');

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="m-0 font-[family-name:var(--serif)] text-xl font-normal">
          {t('tilesTitle')}
        </h2>
        <p className="text-xs text-[var(--ink-4)]">{t('tilesHint')}</p>
      </div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
        {tiles.map((tile) => (
          <li key={tile.shape}>
            <button
              type="button"
              aria-pressed={tile.isKnown}
              onClick={() => onToggle(tile.shape)}
              className={`${TILE} w-full ${tile.isKnown ? KNOWN : UNKNOWN}`}
            >
              <span className="font-[family-name:var(--serif)] text-[28px] font-medium leading-none">
                {tile.shape}
              </span>
              <span className="text-[11px] tabular-nums">
                {t('tileSongs', { count: tile.songCount })}
              </span>
              <span className="min-h-[14px] font-[family-name:var(--mono)] text-[10px] uppercase tracking-[0.1em] text-[var(--gold-2)]">
                {tile.isKnown
                  ? t('tileKnown')
                  : tile.gain > 0
                    ? t('tileGain', { count: tile.gain })
                    : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
