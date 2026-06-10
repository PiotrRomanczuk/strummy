import { I, Icon } from '../lib/icons';
import { TODAY } from '../lib/mock-data';

export const TeacherGreeting = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 20,
    }}
  >
    <div>
      <div
        style={{
          color: 'var(--ink-4)',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '.16em',
          marginBottom: 6,
        }}
      >
        {TODAY.day} · {TODAY.date}, {TODAY.year} · Week {TODAY.weekNum}
      </div>
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--serif)',
          fontWeight: 400,
          fontSize: 38,
          letterSpacing: '-0.02em',
          lineHeight: 1.05,
        }}
      >
        Good afternoon, <em style={{ fontStyle: 'italic', color: 'var(--gold-2)' }}>Sarah</em>.
      </h1>
      <div style={{ color: 'var(--ink-3)', fontSize: 14, marginTop: 8, maxWidth: 560 }}>
        <span style={{ color: 'var(--ink)', fontWeight: 500 }}>Carlos</span> hasn’t practiced in 11
        days. Consider an easier warm-up before today’s 5:00 session.
      </div>
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        style={{
          padding: '9px 14px',
          borderRadius: 8,
          border: '1px solid var(--rule)',
          background: 'var(--card)',
          color: 'var(--ink-2)',
          fontSize: 13,
          cursor: 'pointer',
          fontFamily: 'var(--sans)',
        }}
      >
        Assignments
      </button>
      <button
        style={{
          padding: '9px 14px',
          borderRadius: 8,
          background: 'var(--ink)',
          color: 'var(--paper)',
          border: 'none',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--sans)',
        }}
      >
        <Icon d={I.plus} size={12} stroke="var(--paper)" /> New lesson
      </button>
    </div>
  </div>
);
