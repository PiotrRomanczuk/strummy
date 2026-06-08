import { AGENDA } from '../lib/mock-data';
import { Avatar, Eyebrow, HealthDot, PulseDot } from '../primitives/atoms';
import { StringVibration } from '../primitives/StringVibration';

const STARTS = 9;
const ENDS = 20;
const NOW_HOUR = 15 + 46 / 60;
const HOUR_PX = 56;

const parseLessonHour = (time: string): number => {
  const [hPart, mPart = '0'] = time.replace(/[ap]/, '').split(':');
  let hour = parseInt(hPart, 10) + parseInt(mPart, 10) / 60;
  if (time.includes('p') && hour < 12) hour += 12;
  return hour;
};

const SCOPE_TABS = ['Today', 'Week', 'Month'] as const;

export const TeacherDaySpine = () => {
  const totalHours = ENDS - STARTS;
  const totalH = totalHours * HOUR_PX;
  const lessons = AGENDA.map((l, idx) => ({ ...l, hour: parseLessonHour(l.time), idx }));

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--rule)',
        borderRadius: 18,
        boxShadow: '0 1px 2px rgba(26,22,19,.04), 0 10px 40px -20px rgba(26,22,19,.08)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          padding: '22px 24px 14px 24px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <div>
          <Eyebrow style={{ color: 'var(--gold-2)' }}>Today’s schedule</Eyebrow>
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 28,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              marginTop: 2,
            }}
          >
            3 lessons · <span style={{ color: 'var(--ink-4)' }}>2h 0m teaching</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {SCOPE_TABS.map((t, i) => (
            <button
              key={t}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: i === 0 ? '1px solid var(--ink)' : '1px solid var(--rule)',
                background: i === 0 ? 'var(--ink)' : 'var(--card)',
                color: i === 0 ? 'var(--paper)' : 'var(--ink-3)',
                fontSize: 11,
                cursor: 'pointer',
                fontFamily: 'var(--sans)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 80,
          height: totalH + 24,
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      >
        <StringVibration width={900} height={totalH + 24} color="var(--gold-2)" opacity={0.07} />
      </div>

      <div style={{ position: 'relative', height: totalH, padding: '12px 24px 12px 24px' }}>
        {Array.from({ length: totalHours + 1 }).map((_, i) => {
          const hour = STARTS + i;
          const display = hour > 12 ? `${hour - 12}p` : hour === 12 ? '12p' : `${hour}a`;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 24,
                right: 24,
                top: i * HOUR_PX + 12,
                display: 'grid',
                gridTemplateColumns: '52px 1fr',
                gap: 14,
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  color: 'var(--ink-4)',
                  textAlign: 'right',
                }}
              >
                {display}
              </div>
              <div
                style={{
                  height: 1,
                  background: 'var(--rule)',
                  opacity: hour % 2 === 0 ? 0.9 : 0.4,
                }}
              />
            </div>
          );
        })}

        <div
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            top: (NOW_HOUR - STARTS) * HOUR_PX + 12,
            display: 'grid',
            gridTemplateColumns: '52px 1fr',
            gap: 14,
            alignItems: 'center',
            zIndex: 3,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: 'var(--gold-2)',
              textAlign: 'right',
              fontWeight: 600,
            }}
          >
            3:46p
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 4,
                background: 'var(--gold-2)',
                color: '#fff',
                fontFamily: 'var(--mono)',
                fontSize: 9,
                letterSpacing: '.12em',
                fontWeight: 600,
                boxShadow: 'inset 0 -1px 0 rgba(0,0,0,.18)',
              }}
            >
              CAPO · NOW
            </span>
            <span
              style={{
                flex: 1,
                height: 2,
                background: 'linear-gradient(90deg, var(--gold-2), transparent)',
                borderRadius: 1,
              }}
            />
            <PulseDot color="var(--gold-2)" size={6} />
          </div>
        </div>

        {lessons.map((l, idx) => {
          const top = (l.hour - STARTS) * HOUR_PX + 12;
          const durM = parseInt(l.duration, 10) || 45;
          const h = (durM / 60) * HOUR_PX;
          const isNext = idx === 0;
          return (
            <div
              key={l.id}
              style={{
                position: 'absolute',
                left: 24 + 52 + 14,
                right: 24,
                top,
                height: Math.max(72, h - 6),
                border: '1px solid ' + (isNext ? 'var(--gold-dim)' : 'var(--rule)'),
                background: isNext
                  ? 'linear-gradient(135deg, var(--gold-tint), var(--card))'
                  : 'var(--card)',
                borderRadius: 12,
                padding: '12px 16px',
                boxShadow: isNext ? '0 8px 24px -12px rgba(200,149,35,.35)' : 'var(--shadow-sm)',
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: 14,
                alignItems: 'flex-start',
                zIndex: 2,
                cursor: 'pointer',
              }}
            >
              <Avatar s={l.student} size={36} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{l.student.name}</span>
                  <HealthDot health={l.student.health} size={7} />
                  <span style={{ color: 'var(--ink-4)', fontSize: 11 }}>· {l.student.level}</span>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    color: 'var(--ink-3)',
                    marginTop: 3,
                  }}
                >
                  {l.time}–{l.endTime} · {l.duration}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {l.songs.slice(0, 2).map((sg, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: 'rgba(0,0,0,.04)',
                        fontStyle: 'italic',
                        fontFamily: 'var(--serif)',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontStyle: 'normal',
                          color: 'var(--gold-2)',
                          marginRight: 4,
                        }}
                      >
                        {sg.key}
                      </span>
                      {sg.title}
                    </span>
                  ))}
                </div>
              </div>
              <button
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: isNext ? 'var(--ink)' : 'transparent',
                  color: isNext ? 'var(--paper)' : 'var(--ink-2)',
                  border: isNext ? 'none' : '1px solid var(--rule)',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--sans)',
                }}
              >
                {isNext ? 'Prep →' : 'Open'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
