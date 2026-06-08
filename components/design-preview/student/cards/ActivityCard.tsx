import { STUDENT_ACTIVITY } from '../../lib/mock-data';
import { Eyebrow, TimeAgo } from '../../primitives/atoms';

const TYPE_COLOR: Record<string, string> = {
  assignment: 'var(--gold-2)',
  mastered: 'var(--success)',
  lesson: 'var(--info)',
  note: 'var(--ink-2)',
  practice: 'var(--ink-2)',
};

export const ActivityCard = () => (
  <div
    style={{
      background: 'var(--card)',
      border: '1px solid var(--rule)',
      borderRadius: 14,
      padding: '22px 24px',
      boxShadow: 'var(--shadow-sm)',
    }}
  >
    <Eyebrow style={{ marginBottom: 12 }}>Activity</Eyebrow>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {STUDENT_ACTIVITY.map((a, i) => {
        const c = TYPE_COLOR[a.type] ?? 'var(--ink-2)';
        return (
          <div
            key={a.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '14px 1fr auto',
              gap: 12,
              alignItems: 'flex-start',
              padding: '10px 0',
              borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
              borderBottom: '1px solid var(--rule)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: c,
                marginTop: 5,
              }}
            />
            <div style={{ fontSize: 12, lineHeight: 1.45 }}>
              <span style={{ color: c, fontWeight: 500 }}>{a.label}</span>{' '}
              <span style={{ color: 'var(--ink-2)' }}>{a.obj}</span>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
              <TimeAgo minutes={a.mins} />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
