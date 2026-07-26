/** Sidebar + top bar chrome for the hero's mock dashboard. */

const SIDEBAR_GLYPHS = [
  'M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  'M4 5h13a3 3 0 0 1 3 3v12H7a3 3 0 0 1-3-3zM4 5a3 3 0 0 0 3 3h13',
  'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  'M9 11l3 3 7-7M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9',
  'M3 3v18h18M7 14l3-3 4 4 6-6',
  'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm0 4h18M8 3v4M16 3v4',
  'M3 6h18M3 10h18M3 14h18M3 18h18M7 3v18M13 3v18M19 3v18',
];

export const HeroSidebar = () => (
  <aside
    style={{
      width: 54,
      flex: '0 0 54px',
      background: 'var(--paper)',
      borderRight: '1px solid var(--rule)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '14px 0',
      gap: 4,
    }}
  >
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: 6,
        marginBottom: 8,
        background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-2) 100%)',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M5 19c0-3 2-5 4-6s2-4 5-4 5 3 5 3-2 2-5 2-3 2-5 3-4 2-4 2z" />
      </svg>
    </div>
    {SIDEBAR_GLYPHS.map((d, i) => (
      <div
        key={i}
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          display: 'grid',
          placeItems: 'center',
          color: i === 0 ? 'var(--ink)' : 'var(--ink-4)',
          background: i === 0 ? 'var(--rule-2)' : 'transparent',
          position: 'relative',
        }}
      >
        {i === 0 && (
          <span
            style={{
              position: 'absolute',
              left: -10,
              top: 8,
              bottom: 8,
              width: 2,
              background: 'var(--gold)',
              borderRadius: '0 2px 2px 0',
            }}
          />
        )}
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={d} />
        </svg>
      </div>
    ))}
  </aside>
);

export const HeroTopbar = () => (
  <div
    style={{
      height: 42,
      borderBottom: '1px solid var(--rule)',
      background: 'var(--paper)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 10,
    }}
  >
    <div
      style={{
        padding: '5px 12px',
        background: 'var(--rule-2)',
        borderRadius: 999,
        color: 'var(--ink-4)',
        fontSize: 11,
        minWidth: 200,
      }}
    >
      Search students, songs…
    </div>
    <div style={{ flex: 1 }} />
    <div
      style={{
        padding: '4px 10px',
        borderRadius: 999,
        background: 'var(--gold-tint)',
        color: 'var(--gold-2)',
        fontSize: 10,
        fontWeight: 500,
      }}
    >
      Wk 17
    </div>
    <div
      style={{
        background: 'var(--ink)',
        color: 'var(--paper)',
        padding: '6px 12px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 500,
      }}
    >
      + New lesson
    </div>
  </div>
);

const STATS = [
  { l: 'Lessons today', v: '3', u: '2h 0m total' },
  { l: 'Active students', v: '27', u: 'of 31 this week' },
  { l: 'Studio streak', v: '11', u: 'days on average' },
];

export const HeroStatsRow = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
    {STATS.map((s) => (
      <div
        key={s.l}
        style={{
          background: 'var(--card)',
          border: '1px solid var(--rule)',
          borderRadius: 8,
          padding: '12px 14px',
        }}
      >
        <div
          style={{
            color: 'var(--ink-4)',
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '.12em',
            fontWeight: 500,
          }}
        >
          {s.l}
        </div>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 28,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            marginTop: 6,
          }}
        >
          {s.v}
        </div>
        <div style={{ color: 'var(--ink-4)', fontSize: 10, marginTop: 6 }}>{s.u}</div>
      </div>
    ))}
  </div>
);
