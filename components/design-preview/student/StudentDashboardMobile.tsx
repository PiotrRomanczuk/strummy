import { I, Icon } from '../lib/icons';
import {
  ME_STUDENT,
  STUDENT_LAST_LESSON,
  STUDENT_NEXT_LESSON,
  STUDENT_PRACTICE_TODAY,
} from '../lib/mock-data';
import { Eyebrow, PulseDot } from '../primitives/atoms';
import { ProgressBar } from '../primitives/ProgressBar';
import { StringVibration } from '../primitives/StringVibration';

const SUMMARY_TILES = [
  { label: 'Streak', value: `${ME_STUDENT.streak}d`, accent: 'var(--gold-2)' },
  {
    label: 'Songs',
    value: ME_STUDENT.totalSongs.toString(),
    accent: undefined as string | undefined,
  },
  { label: 'Mastered', value: ME_STUDENT.mastered.toString(), accent: 'var(--success)' },
];

export const StudentDashboardMobile = () => {
  const { with: teacher, time, inMinutes, duration } = STUDENT_NEXT_LESSON;
  const h = Math.floor(inMinutes / 60);
  const m = inMinutes % 60;

  return (
    <div
      className="app-viewport"
      style={{
        width: 390,
        height: 844,
        background: 'var(--ivory)',
        color: 'var(--ink)',
        overflow: 'hidden',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          height: 44,
          padding: '12px 24px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'var(--mono)',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <span>4:42</span>
        <span>● ● ●</span>
      </div>

      <div
        style={{
          padding: '8px 20px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <Eyebrow>Thursday · Apr 23</Eyebrow>
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 24,
              marginTop: 2,
              letterSpacing: '-0.02em',
            }}
          >
            Hi, <em style={{ color: 'var(--gold-2)' }}>Liam</em>
          </div>
        </div>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: ME_STUDENT.color,
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {ME_STUDENT.avatar}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 16px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: 'var(--card)',
            borderRadius: 16,
            border: '1px solid var(--rule)',
            padding: '18px 18px 20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, opacity: 0.4 }}>
            <StringVibration width={400} height={220} color="var(--gold-2)" opacity={0.12} />
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PulseDot size={6} />
              <Eyebrow style={{ color: 'var(--gold-2)' }}>Lesson with {teacher}</Eyebrow>
            </div>
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 52,
                lineHeight: 0.95,
                letterSpacing: '-0.035em',
                fontWeight: 400,
                marginTop: 8,
              }}
            >
              in{' '}
              <em style={{ color: 'var(--gold-2)' }}>
                {h}h {m}m
              </em>
            </div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--ink-3)',
                marginTop: 8,
              }}
            >
              {time} · {duration} · Studio A
            </div>
            <button
              style={{
                width: '100%',
                marginTop: 14,
                padding: '12px',
                background: 'var(--ink)',
                color: 'var(--paper)',
                border: 'none',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontFamily: 'var(--sans)',
              }}
            >
              <Icon d={I.play} size={11} stroke="none" fill="var(--paper)" /> Start today’s practice
            </button>
          </div>
        </div>

        <div
          style={{
            background: 'var(--card)',
            borderRadius: 14,
            border: '1px solid var(--rule)',
            padding: '18px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 6,
            }}
          >
            <Eyebrow>Today’s practice</Eyebrow>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
              {ME_STUDENT.practiceMinToday}/{ME_STUDENT.practiceGoal} min
            </span>
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginBottom: 10 }}>
            30 min · 3 pieces
          </div>
          <ProgressBar
            value={ME_STUDENT.practiceMinToday}
            max={ME_STUDENT.practiceGoal}
            delay={100}
          />
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column' }}>
            {STUDENT_PRACTICE_TODAY.map((p, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '20px 1fr auto',
                  gap: 10,
                  alignItems: 'center',
                  padding: '10px 0',
                  borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
                  borderBottom: '1px solid var(--rule)',
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    border: '1.5px solid var(--ink-5)',
                  }}
                />
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--serif)',
                      fontSize: 14,
                      fontStyle: p.kind === 'song' ? 'italic' : 'normal',
                      fontWeight: 500,
                    }}
                  >
                    {p.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{p.sub}</div>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  {p.mins}m
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: 'var(--card)',
            borderRadius: 14,
            border: '1px solid var(--rule)',
            padding: '16px 18px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 14,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {SUMMARY_TILES.map((m, i) => (
            <div
              key={i}
              style={{
                textAlign: 'center',
                borderLeft: i === 0 ? 'none' : '1px solid var(--rule)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 24,
                  letterSpacing: '-0.02em',
                  color: m.accent || 'var(--ink)',
                  fontWeight: 500,
                }}
              >
                {m.value}
              </div>
              <Eyebrow style={{ marginTop: 2 }}>{m.label}</Eyebrow>
            </div>
          ))}
        </div>

        <div
          style={{
            background: 'var(--card)',
            borderRadius: 14,
            border: '1px solid var(--rule)',
            padding: '16px 18px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Eyebrow>Last lesson</Eyebrow>
          <div
            style={{
              marginTop: 8,
              fontFamily: 'var(--serif)',
              fontStyle: 'italic',
              fontSize: 14,
              lineHeight: 1.5,
              paddingLeft: 12,
              borderLeft: '2px solid var(--gold-dim)',
              color: 'var(--ink-2)',
            }}
          >
            “{STUDENT_LAST_LESSON.recap.slice(0, 140)}…”
          </div>
        </div>

        <div
          style={{
            textAlign: 'center',
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--ink-4)',
            marginTop: 6,
            letterSpacing: '.1em',
          }}
        >
          KEEP SCROLLING · REPERTOIRE · ACHIEVEMENTS · ACTIVITY
        </div>
      </div>
    </div>
  );
};
