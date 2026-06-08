import { STUDENTS } from '../../lib/mock-data';
import type { Health } from '../../lib/types';
import { Avatar, Eyebrow, HealthDot } from '../../primitives/atoms';
import { ProgressBar } from '../../primitives/ProgressBar';

const HEALTH_ORDER: Record<Health, number> = {
  at_risk: 0,
  needs_attention: 1,
  good: 2,
  excellent: 3,
  critical: -1,
};

const SORT_TABS = ['Health', 'Recent', 'A–Z'] as const;

const barColor = (h: Health) =>
  h === 'at_risk' ? 'var(--danger)' : h === 'needs_attention' ? 'var(--warn)' : 'var(--gold-2)';

export const StudentRoster = () => {
  const sorted = [...STUDENTS].sort((a, b) => HEALTH_ORDER[a.health] - HEALTH_ORDER[b.health]);

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--rule)',
        borderRadius: 14,
        padding: '20px 22px',
        boxShadow: 'var(--shadow-sm)',
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
          <Eyebrow>Studio</Eyebrow>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginTop: 2 }}>
            6 active students
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {SORT_TABS.map((t, i) => (
            <button
              key={t}
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                background: i === 0 ? 'var(--ink)' : 'transparent',
                color: i === 0 ? 'var(--paper)' : 'var(--ink-3)',
                border: i === 0 ? 'none' : '1px solid var(--rule)',
                fontSize: 10,
                cursor: 'pointer',
                fontFamily: 'var(--sans)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {sorted.map((s, i) => (
          <div
            key={s.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '28px 1fr 80px 120px 60px',
              gap: 12,
              alignItems: 'center',
              padding: '10px 0',
              borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
              borderBottom: '1px solid var(--rule)',
            }}
          >
            <Avatar s={s} size={26} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span>
                <HealthDot health={s.health} size={6} />
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--ink-4)',
                  fontFamily: 'var(--mono)',
                }}
              >
                {s.level.toUpperCase()} · {s.years}Y
              </div>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>
              <div>{s.songs} songs</div>
              <div>{s.streak}w streak</div>
            </div>
            <ProgressBar value={s.progress} max={100} delay={80 * i} color={barColor(s.health)} />
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: 'var(--ink-3)',
                textAlign: 'right',
              }}
            >
              {s.nextLesson.startsWith('Today') ? (
                <span style={{ color: 'var(--gold-2)', fontWeight: 500 }}>
                  {s.nextLesson.replace('Today · ', '')}
                </span>
              ) : (
                s.nextLesson.replace('Apr ', '')
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
