import { I, Icon } from '../../lib/icons';
import { ME_STUDENT, STUDENT_ACHIEVEMENTS } from '../../lib/mock-data';
import { Eyebrow } from '../../primitives/atoms';

export const AchievementsCard = () => (
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
        marginBottom: 12,
      }}
    >
      <Eyebrow>Achievements</Eyebrow>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
        {ME_STUDENT.achievements}/12
      </span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {STUDENT_ACHIEVEMENTS.map((a, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '32px 1fr auto',
            gap: 12,
            alignItems: 'center',
            opacity: a.unlocked ? 1 : 0.65,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: a.unlocked ? 'var(--gold-tint)' : 'var(--rule-2)',
              display: 'grid',
              placeItems: 'center',
              border: a.unlocked ? '1px solid var(--gold-dim)' : '1px dashed var(--rule)',
            }}
          >
            <Icon
              d={a.unlocked ? I.mastered : I.spark}
              size={14}
              stroke={a.unlocked ? 'var(--gold-2)' : 'var(--ink-4)'}
            />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{a.sub}</div>
          </div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: a.unlocked ? 'var(--success)' : 'var(--ink-4)',
            }}
          >
            {a.unlocked ? a.when : `${a.progress}/${a.max}`}
          </div>
        </div>
      ))}
    </div>
  </div>
);
