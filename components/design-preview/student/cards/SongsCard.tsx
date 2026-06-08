'use client';

import { useState } from 'react';

import { I, Icon } from '../../lib/icons';
import { ME_STUDENT, STUDENT_SONGS } from '../../lib/mock-data';
import type { SongStatusKey } from '../../lib/types';
import { Eyebrow } from '../../primitives/atoms';
import { FretProgress } from '../../primitives/FretProgress';
import { StatusPill } from '../../primitives/StatusPill';

const FILTERS: Array<[SongStatusKey | 'all', string]> = [
  ['all', 'All'],
  ['to_learn', 'To learn'],
  ['started', 'Started'],
  ['remembered', 'Remembered'],
  ['with_author', 'With author'],
  ['mastered', 'Mastered'],
];

export const SongsCard = () => {
  const [filter, setFilter] = useState<SongStatusKey | 'all'>('all');
  const songs = filter === 'all' ? STUDENT_SONGS : STUDENT_SONGS.filter((s) => s.status === filter);

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--rule)',
        borderRadius: 14,
        padding: '22px 24px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
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
          <Eyebrow>Repertoire</Eyebrow>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginTop: 2 }}>
            {ME_STUDENT.totalSongs} songs ·{' '}
            <span style={{ color: 'var(--success)' }}>{ME_STUDENT.mastered} mastered</span>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 4,
            background: 'var(--rule-2)',
            padding: 3,
            borderRadius: 999,
            fontSize: 11,
          }}
        >
          {FILTERS.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              style={{
                padding: '4px 10px',
                border: 'none',
                borderRadius: 999,
                cursor: 'pointer',
                background: filter === k ? 'var(--card)' : 'transparent',
                color: filter === k ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: filter === k ? 500 : 400,
                boxShadow: filter === k ? 'var(--shadow-sm)' : 'none',
                fontFamily: 'var(--sans)',
                fontSize: 11,
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {songs.map((s, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 200px 80px 28px',
              gap: 14,
              alignItems: 'center',
              padding: '12px 0',
              borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
              borderBottom: '1px solid var(--rule)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--gold-2)',
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: 9,
                  color: 'var(--ink-4)',
                  letterSpacing: '.1em',
                }}
              >
                KEY
              </span>
              {s.key}
              {s.capo > 0 && <span style={{ color: 'var(--ink-4)' }}> · capo {s.capo}</span>}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 16,
                  fontStyle: 'italic',
                  fontWeight: 500,
                }}
              >
                {s.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>{s.author}</div>
            </div>
            <div>
              <FretProgress status={s.status} width={170} height={22} showLabels={false} />
              <div style={{ marginTop: 4 }}>
                <StatusPill status={s.status} compact />
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
              <div>{s.myMins}m</div>
              <div style={{ fontSize: 10, marginTop: 1 }}>{s.lastPracticed}</div>
            </div>
            <Icon d={I.chevron} size={14} style={{ color: 'var(--ink-4)' }} />
          </div>
        ))}
      </div>
    </div>
  );
};
