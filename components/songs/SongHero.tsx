import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Plus } from 'lucide-react';

import { songPrimaryButton } from './song-hero.styles';
import { getTranslations } from 'next-intl/server';

import type { Song } from '@/components/songs/types';

import { msToClock, levelLabel } from './song-format.helpers';
import { SongHeroEditLink } from './SongHero.EditLink';
import { SongHeroDeleteButton } from './SongHero.DeleteButton';
import { SongOfTheWeekAdmin } from './SongOfTheWeekAdmin';
import { SongHeroHeaderActions } from './SongHero.HeaderActions';

type Props = { song: Song; chordTokens: string[]; canEdit?: boolean };

const META_ITEM: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 9,
  color: 'var(--ink-4)',
  textTransform: 'uppercase',
  letterSpacing: '.16em',
};

const META_VALUE: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 14,
  color: 'var(--ink-2)',
  fontWeight: 500,
  marginTop: 2,
};

const Meta = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div style={META_ITEM}>{label}</div>
    <div style={META_VALUE}>{value}</div>
  </div>
);

export const SongHero = async ({ song, chordTokens, canEdit = false }: Props) => {
  const t = await getTranslations('Songs');
  const duration = msToClock(song.duration_ms ?? null);
  const tags: string[] = [];
  if (song.category) tags.push(song.category);
  if (song.strumming_pattern) tags.push(t('strumTag', { pattern: song.strumming_pattern }));
  if (chordTokens.length > 0) {
    tags.push(t('chordCount', { count: chordTokens.length }));
  }

  return (
    <div style={{ padding: '24px 32px 0' }}>
      {/* Claude Design breadcrumb + action row. It wraps on narrow screens —
          the controls need ~600px on one line. */}
      <div className="mb-[18px] flex flex-wrap items-center gap-2">
        <nav
          aria-label="Breadcrumb"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: 'var(--ink-4)',
            fontFamily: 'var(--mono)',
            minWidth: 0,
          }}
        >
          <Link href="/dashboard/songs" style={{ color: 'inherit', textDecoration: 'none' }}>
            {t('formCrumb')}
          </Link>
          <ChevronRight size={10} aria-hidden="true" />
          <span
            style={{
              color: 'var(--ink-2)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {song.title || t('untitledFallback')}
          </span>
        </nav>
        <div style={{ flex: 1 }} />
        {canEdit && (
          <>
            <SongOfTheWeekAdmin songId={song.id} />
            <SongHeroDeleteButton
              songId={song.id}
              songTitle={song.title ?? t('untitledFallback')}
            />
            <SongHeroHeaderActions songId={song.id} />
            <SongHeroEditLink songId={song.id} />
            {/* A plain in-page anchor jumps to the sidebar's quick-assign
                section — the browser handles the scroll. */}
            <a
              href="#quick-assign"
              data-testid="assign-to-student-button"
              style={songPrimaryButton}
            >
              <Plus size={12} strokeWidth={1.8} aria-hidden="true" /> {t('assignToStudentShort')}
            </a>
          </>
        )}
      </div>
      <div
        className="grid grid-cols-1 md:grid-cols-[160px_1fr]"
        style={{
          gap: 28,
          alignItems: 'flex-end',
        }}
      >
        <div
          className="w-[100px] h-[100px] md:w-[160px] md:h-[160px]"
          style={{
            position: 'relative',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: 'inset 0 -3px 0 rgba(0,0,0,.2), 0 12px 24px -10px rgba(0,0,0,.3)',
            background: 'linear-gradient(135deg, #b84a3a 0%, #c89523 60%, #6d4fa0 100%)',
          }}
        >
          {song.cover_image_url ? (
            <Image
              src={song.cover_image_url}
              alt={`${song.title} cover`}
              fill
              sizes="160px"
              className="object-cover"
              priority
            />
          ) : (
            <svg
              viewBox="0 0 160 160"
              width="160"
              height="160"
              style={{ position: 'absolute', inset: 0 }}
            >
              {[60, 50, 38, 26, 14].map((r) => (
                <circle
                  key={r}
                  cx="80"
                  cy="80"
                  r={r}
                  fill="none"
                  stroke="rgba(0,0,0,.18)"
                  strokeWidth="1"
                />
              ))}
              <circle cx="80" cy="80" r="6" fill="rgba(0,0,0,.4)" />
            </svg>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 6,
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--ink-4)',
              textTransform: 'uppercase',
              letterSpacing: '.14em',
            }}
          >
            <span style={{ color: 'var(--gold-2)' }}>{t('heroEyebrow')}</span>
            {song.level && (
              <>
                <span>·</span>
                <span>{levelLabel(song.level, t)}</span>
              </>
            )}
            {song.release_year != null && (
              <>
                <span>·</span>
                <span>{song.release_year}</span>
              </>
            )}
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--serif)',
              fontWeight: 400,
              fontSize: 64,
              letterSpacing: '-0.03em',
              lineHeight: 0.95,
              overflowWrap: 'anywhere',
              fontStyle: 'italic',
            }}
          >
            {song.title || t('untitledFallback')}
          </h1>
          {song.author && (
            <div
              style={{
                marginTop: 8,
                fontSize: 18,
                color: 'var(--ink-3)',
                fontFamily: 'var(--serif)',
              }}
            >
              {song.author}
            </div>
          )}
          <div
            style={{
              marginTop: 18,
              display: 'flex',
              gap: 20,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {song.key && <Meta label={t('metaKey')} value={song.key} />}
            {song.capo_fret != null && song.capo_fret > 0 && (
              <Meta label={t('metaCapo')} value={t('capoFret', { fret: song.capo_fret })} />
            )}
            {song.tempo != null && (
              <Meta label={t('metaTempo')} value={t('tempoBpm', { tempo: song.tempo })} />
            )}
            {song.time_signature != null && (
              <Meta label={t('metaTime')} value={`${song.time_signature}/4`} />
            )}
            {duration && <Meta label={t('metaLength')} value={duration} />}
            {tags.length > 0 && (
              <>
                <div
                  style={{
                    width: 1,
                    height: 32,
                    background: 'var(--rule)',
                    margin: '0 4px',
                  }}
                />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 10,
                        padding: '4px 9px',
                        background: 'var(--paper)',
                        border: '1px solid var(--rule)',
                        borderRadius: 99,
                        color: 'var(--ink-3)',
                        textTransform: 'uppercase',
                        letterSpacing: '.1em',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
