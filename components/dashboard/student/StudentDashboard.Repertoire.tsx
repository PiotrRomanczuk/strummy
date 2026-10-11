'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FretProgress, StagePill } from '@/components/songs/FretProgress';
import { STAGES, stageLabelKey, type StageKey } from '@/components/songs/SongPrimitives';
import type { RepertoireSong } from '@/lib/services/student-home-repertoire-queries';

import { cardTitle, eyebrow, HomeCard } from './StudentHomePrimitives';

type Props = { songs: RepertoireSong[]; agoBySong: Record<string, string | null> };
type Filter = 'all' | StageKey;

const isStage = (s: string): s is StageKey => STAGES.some((st) => st.key === s);

const minutesLabel = (m: number) => (m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`);

/** "Repertoire": every song with its key, a fret-progress strip and practice time. */
export function StudentRepertoireCard({ songs, agoBySong }: Props) {
  const t = useTranslations('StudentHome');
  const ts = useTranslations('Songs');
  const [filter, setFilter] = useState<Filter>('all');
  const shown = filter === 'all' ? songs : songs.filter((s) => s.status === filter);
  const mastered = songs.filter((s) => s.status === 'mastered').length;
  const filters: [Filter, string][] = [
    ['all', t('filterAll')],
    ...STAGES.map((s): [Filter, string] => [s.key, ts(stageLabelKey(s.key))]),
  ];

  return (
    <HomeCard>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <div style={eyebrow}>{t('repertoire')}</div>
          <div style={cardTitle}>
            {t('songCount', { count: songs.length })} ·{' '}
            <span style={{ color: 'var(--success)' }}>
              {t('masteredCount', { count: mastered })}
            </span>
          </div>
        </div>
        <div
          role="tablist"
          style={{
            display: 'flex',
            gap: 4,
            background: 'var(--rule-2)',
            padding: 3,
            borderRadius: 999,
            maxWidth: '100%',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {filters.map(([key, label]) => {
            const isActive = filter === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setFilter(key)}
                style={{
                  padding: '4px 10px',
                  border: 'none',
                  borderRadius: 999,
                  cursor: 'pointer',
                  background: isActive ? 'var(--card)' : 'transparent',
                  color: isActive ? 'var(--ink)' : 'var(--ink-3)',
                  fontWeight: isActive ? 500 : 400,
                  boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                  fontFamily: 'var(--sans)',
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--rule)' }}>
        {shown.length === 0 && (
          <div
            style={{
              padding: '16px 0',
              color: 'var(--ink-4)',
              fontFamily: 'var(--serif)',
              fontStyle: 'italic',
              fontSize: 14,
            }}
          >
            {songs.length === 0 ? t('emptyRepertoire') : t('emptyFilter')}
          </div>
        )}
        {shown.map((s) => (
          <Link
            key={s.songId}
            href={`/dashboard/songs/${s.songId}`}
            className="ui-student-song-row ui-row"
          >
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--gold-2)' }}>
              <span
                style={{
                  display: 'block',
                  fontSize: 9,
                  color: 'var(--ink-4)',
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                }}
              >
                {t('key')}
              </span>
              {s.musicalKey ?? '—'}
              {s.capo ? <span style={{ color: 'var(--ink-4)' }}> · capo {s.capo}</span> : null}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 16,
                  fontStyle: 'italic',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.title}
              </div>
              {s.author && (
                <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>{s.author}</div>
              )}
            </div>
            <div className="ui-student-song-fret">
              <FretProgress status={s.status} />
              <div style={{ marginTop: 4 }}>
                <StagePill
                  status={s.status}
                  label={isStage(s.status) ? ts(stageLabelKey(s.status)) : s.status}
                />
              </div>
            </div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--ink-4)',
                textAlign: 'right',
              }}
            >
              <div>{minutesLabel(s.minutes)}</div>
              {agoBySong[s.songId] && (
                <div style={{ fontSize: 10, marginTop: 1 }}>
                  {t('agoShort', { time: agoBySong[s.songId] ?? '' })}
                </div>
              )}
            </div>
            <ChevronRight
              className="ui-student-song-chev"
              size={14}
              style={{ color: 'var(--ink-4)' }}
            />
          </Link>
        ))}
      </div>
    </HomeCard>
  );
}
