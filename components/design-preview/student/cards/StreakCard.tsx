import { I, Icon } from '../../lib/icons';
import { ME_STUDENT } from '../../lib/mock-data';
import { Eyebrow } from '../../primitives/atoms';
import { CountUp } from '../../primitives/CountUp';
import { ProgressBar } from '../../primitives/ProgressBar';

export const StreakCard = () => (
  <div
    style={{
      background: 'var(--card)',
      border: '1px solid var(--rule)',
      borderRadius: 14,
      padding: '22px 24px',
      boxShadow: 'var(--shadow-sm)',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.5 }}>
      <Icon
        d={I.flame}
        size={80}
        stroke="var(--gold-dim)"
        fill="var(--gold-tint)"
        strokeWidth={1}
      />
    </div>
    <Eyebrow style={{ color: 'var(--gold-2)' }}>Streak</Eyebrow>
    <div
      style={{
        fontFamily: 'var(--serif)',
        fontSize: 64,
        fontWeight: 400,
        letterSpacing: '-0.03em',
        lineHeight: 1,
        marginTop: 6,
        color: 'var(--ink)',
      }}
    >
      <CountUp to={ME_STUDENT.streak} />
      <span style={{ fontSize: 22, color: 'var(--ink-4)', marginLeft: 8, fontStyle: 'italic' }}>
        days
      </span>
    </div>
    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
      3 more days to your{' '}
      <span style={{ color: 'var(--gold-2)', fontWeight: 500 }}>14-day badge</span>
    </div>
    <div style={{ marginTop: 14 }}>
      <ProgressBar value={ME_STUDENT.streak} max={14} delay={120} />
    </div>
  </div>
);
