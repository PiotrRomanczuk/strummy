import { AGENDA, NEEDS_ATTN } from '../lib/mock-data';
import { Avatar, Eyebrow, HealthDot, PulseDot } from '../primitives/atoms';
import { StringVibration } from '../primitives/StringVibration';

export const TeacherDashboardMobile = () => (
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
      <span>3:46</span>
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
          Hi, <em style={{ color: 'var(--gold-2)' }}>Sarah</em>
        </div>
      </div>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--ink-2)',
          color: 'var(--paper)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        SC
      </div>
    </div>

    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '4px 16px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--card)',
          borderRadius: 16,
          border: '1px solid var(--gold-dim)',
          padding: '16px 18px 18px',
          boxShadow: '0 8px 24px -12px rgba(200,149,35,.35)',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
          <StringVibration width={400} height={200} color="var(--gold-2)" opacity={0.1} />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PulseDot size={6} />
            <Eyebrow style={{ color: 'var(--gold-2)' }}>Next · in 14m</Eyebrow>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <Avatar s={AGENDA[0].student} size={42} />
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 22, letterSpacing: '-0.02em' }}>
                {AGENDA[0].student.name}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                4:00–4:45p · {AGENDA[0].student.level}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {AGENDA[0].songs.map((sg, i) => (
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
            Open lesson prep →
          </button>
        </div>
      </div>

      <div
        style={{
          background: 'var(--card)',
          borderRadius: 14,
          border: '1px solid var(--rule)',
          padding: '14px 16px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <Eyebrow style={{ marginBottom: 10 }}>Today · 3 lessons · 2h</Eyebrow>
        <div style={{ position: 'relative', paddingLeft: 50 }}>
          <span
            style={{
              position: 'absolute',
              left: 46,
              top: 0,
              bottom: 0,
              width: 1,
              background: 'var(--rule)',
            }}
          />
          {AGENDA.map((l, i) => (
            <div
              key={l.id}
              style={{
                position: 'relative',
                marginBottom: 10,
                padding: '10px 12px',
                border: '1px solid var(--rule)',
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: -50,
                  top: 8,
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  color: 'var(--ink-3)',
                  width: 36,
                  textAlign: 'right',
                }}
              >
                {l.time}
              </div>
              <span
                style={{
                  position: 'absolute',
                  left: -9,
                  top: 14,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: i === 0 ? 'var(--gold-2)' : 'var(--card)',
                  border: '1.5px solid ' + (i === 0 ? 'var(--gold-2)' : 'var(--ink-5)'),
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar s={l.student} size={22} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{l.student.name}</span>
                <HealthDot health={l.student.health} size={6} />
              </div>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  color: 'var(--ink-4)',
                  marginTop: 4,
                }}
              >
                {l.duration} · {l.songs.length} pieces
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
          padding: '14px 16px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <Eyebrow style={{ color: 'var(--danger)', marginBottom: 8 }}>Needs attention · 3</Eyebrow>
        {NEEDS_ATTN.map((n, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: 10,
              alignItems: 'center',
              padding: '8px 0',
              borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
              borderBottom: '1px solid var(--rule)',
            }}
          >
            <Avatar s={n.student} size={22} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{n.student.name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{n.reason}</div>
            </div>
          </div>
        ))}
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
        STUDIO · LIBRARY · WEEK
      </div>
    </div>
  </div>
);
