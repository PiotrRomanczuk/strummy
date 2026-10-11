'use client';

import { useTranslations } from 'next-intl';

import { levelLabel } from '@/components/shared/level-label.helpers';

type Props = {
  title: string;
  author: string;
  level: string;
  keyName: string;
  capoFret: number | null;
  tempo: number | null;
  chords: string[];
  coverImageUrl?: string | null;
};

const initialsFor = (title: string): string =>
  title
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '—';

const Meta = ({ label, value, isGold }: { label: string; value: string; isGold?: boolean }) => (
  <div>
    <span style={{ color: 'var(--ink-4)' }}>{label}</span>{' '}
    <span style={{ color: isGold ? 'var(--gold-2)' : 'var(--ink)', fontWeight: 500 }}>{value}</span>
  </div>
);

/** Claude Design song preview: cover square, italic title, "— artist", mono meta, chord chips. */
export const SongFormPreview = ({
  title,
  author,
  level,
  keyName,
  capoFret,
  tempo,
  chords,
  coverImageUrl,
}: Props) => {
  const t = useTranslations('Songs');
  const heading = title || t('formPreviewNewSongFallback');
  const coverBase: React.CSSProperties = {
    width: '100%',
    aspectRatio: '1',
    borderRadius: 10,
    marginBottom: 14,
  };

  return (
    <>
      {coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- 3rd-party Spotify cover art preview
        <img src={coverImageUrl} alt="" style={{ ...coverBase, objectFit: 'cover' }} />
      ) : (
        <div
          style={{
            ...coverBase,
            background: 'linear-gradient(135deg, #b84a3a, #c89523)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--on-accent)',
            fontFamily: 'var(--serif)',
            fontSize: 36,
            boxShadow: 'inset 0 -3px 0 rgba(0,0,0,.25)',
          }}
        >
          {initialsFor(heading)}
        </div>
      )}
      <div
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 20,
          fontStyle: 'italic',
          fontWeight: 500,
          letterSpacing: '-0.01em',
          lineHeight: 1.15,
        }}
      >
        {heading}
      </div>
      <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 4 }}>— {author || '…'}</div>
      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid var(--rule)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          fontSize: 11,
          fontFamily: 'var(--mono)',
          textTransform: 'uppercase',
        }}
      >
        <Meta label={t('metaKey')} value={keyName} />
        <Meta label={t('metaCapo')} value={capoFret ? `${capoFret}fr` : '—'} />
        <Meta label={t('metaTempo')} value={tempo ? `♩${tempo}` : '—'} />
        <Meta label={t('colLevel')} value={levelLabel(level, t).slice(0, 3)} isGold />
      </div>
      {chords.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 12, flexWrap: 'wrap' }}>
          {chords.map((c) => (
            <span
              key={c}
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                fontWeight: 500,
                padding: '2px 6px',
                borderRadius: 4,
                background: 'var(--rule-2)',
                color: 'var(--ink-2)',
              }}
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </>
  );
};
