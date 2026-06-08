import { I, Icon } from '../lib/icons';
import { ME_STUDENT, STUDENT_NEXT_LESSON, STUDENT_PRACTICE_TODAY } from '../lib/mock-data';
import { Eyebrow, PulseDot } from '../primitives/atoms';
import { CountUp } from '../primitives/CountUp';
import { StringVibration } from '../primitives/StringVibration';

import { PracticeRow } from './PracticeRow';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

export const StudentHero = () => {
  const {
    with: teacher,
    withAvatar,
    withColor,
    when,
    time,
    inMinutes,
    duration,
    location,
  } = STUDENT_NEXT_LESSON;
  const h = Math.floor(inMinutes / 60);
  const m = inMinutes % 60;

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--card)',
        border: '1px solid var(--rule)',
        borderRadius: 18,
        boxShadow: '0 1px 2px rgba(26,22,19,.04), 0 10px 40px -20px rgba(26,22,19,.08)',
        marginBottom: 24,
        display: 'grid',
        gridTemplateColumns: '1.05fr 1fr',
        minHeight: 380,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, opacity: 0.55 }}>
        <StringVibration width={1400} height={380} color="var(--gold-2)" opacity={0.1} />
      </div>

      <div
        style={{
          position: 'relative',
          padding: '34px 38px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          borderRight: '1px solid var(--rule)',
          background:
            'linear-gradient(180deg, transparent 0%, color-mix(in oklab, var(--gold-tint) 35%, transparent) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PulseDot color="var(--gold-2)" />
          <Eyebrow style={{ color: 'var(--gold-2)' }}>Next lesson</Eyebrow>
        </div>

        <div>
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 64,
              fontWeight: 400,
              letterSpacing: '-0.035em',
              lineHeight: 0.95,
              color: 'var(--ink)',
            }}
          >
            in{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--gold-2)' }}>
              {h}h {m}m
            </em>
          </div>
          <div
            style={{
              marginTop: 12,
              color: 'var(--ink-3)',
              fontSize: 15,
              lineHeight: 1.45,
              maxWidth: 480,
            }}
          >
            with{' '}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                verticalAlign: 'middle',
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: withColor,
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {withAvatar}
              </span>
              <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{teacher}</span>
            </span>
            {' · '}
            <span style={{ fontFamily: 'var(--mono)' }}>
              {when} {time}
            </span>
            {' · '}
            {duration} · {location}
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <Eyebrow style={{ marginBottom: 8 }}>This week</Eyebrow>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, maxWidth: 380 }}
          >
            {DAYS.map((d, i) => {
              const mins = ME_STUDENT.practiceWeek[i];
              const isToday = i === 3;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 0',
                    borderRadius: 8,
                    background: isToday ? 'var(--card)' : 'transparent',
                    border: isToday ? '1px solid var(--gold-dim)' : '1px solid transparent',
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      textTransform: 'uppercase',
                      letterSpacing: '.12em',
                      fontFamily: 'var(--mono)',
                      color: isToday ? 'var(--gold-2)' : 'var(--ink-4)',
                    }}
                  >
                    {d}
                  </div>
                  <div
                    style={{
                      width: 6,
                      height: 36,
                      borderRadius: 3,
                      background: 'var(--rule-2)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${Math.min(100, (mins / 45) * 100)}%`,
                        background: isToday
                          ? 'var(--gold-2)'
                          : mins === 0
                            ? 'transparent'
                            : 'var(--ink-4)',
                        borderRadius: 3,
                        transition: 'height 1.2s cubic-bezier(.22,.61,.36,1)',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 9,
                      color: isToday ? 'var(--gold-2)' : 'var(--ink-4)',
                      fontWeight: isToday ? 600 : 400,
                    }}
                  >
                    {mins || '·'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            style={{
              padding: '12px 20px',
              background: 'var(--ink)',
              color: 'var(--paper)',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 6px 16px -8px rgba(26,22,19,.4)',
              fontFamily: 'var(--sans)',
            }}
          >
            <Icon d={I.play} size={11} stroke="none" fill="var(--paper)" /> Start today’s practice
          </button>
          <button
            style={{
              padding: '12px 16px',
              background: 'transparent',
              color: 'var(--ink-2)',
              border: '1px solid var(--rule)',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--sans)',
            }}
          >
            Reschedule
          </button>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          padding: '34px 38px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <Eyebrow>Today’s practice</Eyebrow>
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 22,
                fontWeight: 400,
                letterSpacing: '-0.01em',
                marginTop: 2,
              }}
            >
              30 min · 3 pieces
            </div>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
            <CountUp to={ME_STUDENT.practiceMinToday} />/{ME_STUDENT.practiceGoal} min
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {STUDENT_PRACTICE_TODAY.map((p, i) => (
            <PracticeRow key={i} item={p} />
          ))}
        </div>

        <div
          style={{
            marginTop: 'auto',
            background: 'var(--rule-2)',
            border: '1px dashed var(--gold-dim)',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 12,
            color: 'var(--ink-3)',
            lineHeight: 1.45,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: withColor,
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontSize: 10,
              fontWeight: 600,
              flex: '0 0 22px',
            }}
          >
            {withAvatar}
          </div>
          <div>
            <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>Sarah’s note:</span>{' '}
            <em style={{ fontStyle: 'italic' }}>
              “Focus on right-hand independence. Slow is fast.”
            </em>
          </div>
        </div>
      </div>
    </div>
  );
};
