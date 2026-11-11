import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { LibrarySong } from '@/lib/services/teacher-dashboard-studio-queries';

import { eyebrow } from './teacher-dashboard.styles';

/** "Song library · quick assign" — the songs your students are learning most, one click to assign. */
export const SongLibraryCard = async ({
  total,
  songs,
}: {
  total: number;
  songs: LibrarySong[];
}) => {
  const t = await getTranslations('TeacherHome');
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--rule)',
        borderRadius: 14,
        padding: '20px 22px',
        boxShadow: 'var(--shadow-sm)',
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div>
          <div style={eyebrow}>{t('libraryEyebrow')}</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginTop: 2 }}>
            {t('songsInLibrary', { count: total })}
          </div>
        </div>
        <Link
          prefetch={false}
          href="/dashboard/songs"
          style={{ color: 'var(--ink-4)', fontSize: 12, textDecoration: 'none' }}
        >
          {t('openLibrary')}
        </Link>
      </div>
      {songs.map((s, i) => (
        <div
          key={s.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '56px minmax(0,1fr) auto auto',
            gap: 12,
            alignItems: 'center',
            padding: '10px 0',
            borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
            borderBottom: '1px solid var(--rule)',
          }}
        >
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--gold-2)' }}>
            <span
              style={{
                display: 'block',
                fontSize: 9,
                color: 'var(--ink-4)',
                letterSpacing: '.1em',
              }}
            >
              {t('key')}
            </span>
            {s.key ?? '—'}
            {s.capo ? <span style={{ color: 'var(--ink-4)' }}> · {s.capo}</span> : null}
          </div>
          <Link
            prefetch={false}
            href={`/dashboard/songs/${s.id}`}
            style={{ minWidth: 0, color: 'inherit', textDecoration: 'none' }}
          >
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 14,
                fontStyle: 'italic',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {s.title}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{s.author}</div>
          </Link>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: 'var(--ink-3)',
              textAlign: 'right',
            }}
          >
            {t('assignedCount', { count: s.learners })}
          </div>
          <Link
            prefetch={false}
            href={`/dashboard/songs/${s.id}#quick-assign`}
            style={{
              padding: '5px 10px',
              borderRadius: 6,
              border: '1px solid var(--rule)',
              background: 'var(--card)',
              color: 'var(--ink-2)',
              fontSize: 11,
              textDecoration: 'none',
            }}
          >
            {t('assign')}
          </Link>
        </div>
      ))}
    </div>
  );
};
