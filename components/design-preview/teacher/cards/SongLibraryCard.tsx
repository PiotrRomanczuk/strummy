import { Eyebrow } from '../../primitives/atoms';
import type { SongStatusKey } from '../../lib/types';

type LibrarySong = {
  title: string;
  author: string;
  key: string;
  capo: number;
  status: SongStatusKey;
  assigned: number;
};

const SONGS: LibrarySong[] = [
  {
    title: 'Hotel California',
    author: 'Eagles',
    key: 'Bm',
    capo: 7,
    status: 'remembered',
    assigned: 4,
  },
  { title: 'Blackbird', author: 'The Beatles', key: 'G', capo: 0, status: 'started', assigned: 2 },
  {
    title: 'Wish You Were Here',
    author: 'Pink Floyd',
    key: 'C',
    capo: 0,
    status: 'remembered',
    assigned: 3,
  },
  {
    title: 'Tears in Heaven',
    author: 'Eric Clapton',
    key: 'A',
    capo: 0,
    status: 'with_author',
    assigned: 1,
  },
  {
    title: 'Classical Gas',
    author: 'Mason Williams',
    key: 'C',
    capo: 0,
    status: 'started',
    assigned: 1,
  },
];

export const SongLibraryCard = () => (
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
        <Eyebrow>Song library · quick assign</Eyebrow>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginTop: 2 }}>
          128 songs in your library
        </div>
      </div>
      <a style={{ color: 'var(--ink-4)', fontSize: 12, cursor: 'pointer' }}>Open library →</a>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {SONGS.map((s, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '56px 1fr auto auto',
            gap: 12,
            alignItems: 'center',
            padding: '10px 0',
            borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
            borderBottom: '1px solid var(--rule)',
          }}
        >
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--gold-2)' }}>
            <span
              style={{
                display: 'block',
                fontSize: 9,
                color: 'var(--ink-4)',
                letterSpacing: '.1em',
              }}
            >
              KEY
            </span>
            {s.key}
            {s.capo > 0 && <span style={{ color: 'var(--ink-4)' }}> · {s.capo}</span>}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 14,
                fontStyle: 'italic',
                fontWeight: 500,
              }}
            >
              {s.title}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{s.author}</div>
          </div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: 'var(--ink-3)',
              textAlign: 'right',
            }}
          >
            {s.assigned} assigned
          </div>
          <button
            style={{
              padding: '5px 10px',
              borderRadius: 6,
              border: '1px solid var(--rule)',
              background: 'var(--card)',
              color: 'var(--ink-2)',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'var(--sans)',
            }}
          >
            Assign
          </button>
        </div>
      ))}
    </div>
  </div>
);
